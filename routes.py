from flask import Blueprint, jsonify, request, current_app, send_file, g
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from backend.models import User, File
from backend.extensions import db, bcrypt
from backend.rbac import token_required, roles_required

api_bp = Blueprint('api', __name__, url_prefix='/api/v1')

ALLOWED_EXT = {'csv', 'xls', 'xlsx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT

def get_user_from_headers(headers):
    employee_id = headers.get('X-Employee-Id')
    company_id = headers.get('X-Company-Id')
    if not employee_id or not company_id:
        return None
    return User.query.filter_by(employee_id=employee_id, company_id=company_id, is_deactivated=False).first()


# --- AUTH ---
@api_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"message": "Body must be JSON"}), 415
    required = ['employee_id', 'password', 'name', 'company_id', 'role']
    if not all(f in data for f in required):
        return jsonify({"message": "Missing required fields"}), 400
    if User.query.filter_by(employee_id=data['employee_id'], company_id=data['company_id']).first():
        return jsonify({"message": "User already exists"}), 409
    if data['role'] not in ['admin', 'employee']:
        return jsonify({"message": "Invalid role"}), 400
    try:
        u = User(employee_id=data['employee_id'], name=data['name'], role=data['role'], company_id=data['company_id'])
        u.set_password(data['password'])
        db.session.add(u)
        db.session.commit()
        return jsonify({"message": "User registered", "role": u.role}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error: {str(e)}"}), 500


@api_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"message": "Body must be JSON"}), 415
    employee_id = data.get('employee_id')
    password = data.get('password')
    company_id = data.get('company_id')
    user = User.query.filter_by(employee_id=employee_id, company_id=company_id).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid credentials"}), 401
    if user.is_deactivated:
        return jsonify({"message": "Account deactivated"}), 403
    return jsonify({
        "message": "Login successful",
        "user_info": {
            "id": user.id,
            "employee_id": user.employee_id,
            "name": user.name,
            "role": user.role,
            "company_id": user.company_id
        }
    }), 200


# --- DATA UPLOAD ---
@api_bp.route('/data/upload', methods=['POST'])
@token_required
@roles_required(['admin', 'employee'])
def upload_file():
    user = getattr(g, 'current_user', None)
    if not user:
        return jsonify({"message": "Auth failed"}), 401
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400

    uploaded = request.files['file']
    if uploaded.filename == '':
        return jsonify({"message": "No selected file"}), 400
    if not allowed_file(uploaded.filename):
        return jsonify({"message": "Invalid file type"}), 400

    filename = secure_filename(uploaded.filename)
    upload_root = os.path.abspath(current_app.config.get('UPLOAD_FOLDER', 'uploads'))
    os.makedirs(upload_root, exist_ok=True)
    company_dir = os.path.join(upload_root, str(user.company_id))
    os.makedirs(company_dir, exist_ok=True)

    storage_path = os.path.join(company_dir, f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{filename}")
    uploaded.save(storage_path)

    f = File(filename=filename, storage_path=storage_path, company_id=user.company_id,
             uploader_id=user.id, uploader_employee_id=user.employee_id)
    db.session.add(f)
    db.session.commit()
    return jsonify({"message": "File uploaded", "file_id": f.id}), 201


@api_bp.route('/data/files', methods=['GET'])
@token_required
@roles_required(['admin', 'employee'])
def list_files():
    user = getattr(g, 'current_user', None)
    if not user:
        return jsonify({"message": "Auth failed"}), 401
    query = File.query.filter_by(company_id=user.company_id)
    if user.role != 'admin':
        query = query.filter_by(uploader_employee_id=user.employee_id)
    files = query.all()
    return jsonify([{
        "id": f.id,
        "filename": f.filename,
        "uploader": f.uploader_employee_id,
        "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None
    } for f in files]), 200


# --- NEW: FILE DOWNLOAD + DELETE ---
@api_bp.route('/data/download/<int:file_id>', methods=['GET'])
@token_required
@roles_required(['admin', 'employee'])
def download_file(file_id):
    user = getattr(g, 'current_user', None)
    if not user:
        return jsonify({"message": "Auth failed"}), 401
    f = File.query.filter_by(id=file_id, company_id=user.company_id).first()
    if not f:
        return jsonify({"message": "File not found"}), 404
    if not os.path.exists(f.storage_path):
        return jsonify({"message": "File missing"}), 404
    return send_file(f.storage_path, as_attachment=True, download_name=f.filename)


@api_bp.route('/data/delete_file', methods=['DELETE'])
@token_required
@roles_required(['admin'])
def delete_file():
    user = getattr(g, 'current_user', None)
    if not user:
        return jsonify({"message": "Auth failed"}), 401
    data = request.get_json(silent=True) or {}
    file_id = data.get('file_id')
    f = File.query.filter_by(id=file_id, company_id=user.company_id).first()
    if not f:
        return jsonify({"message": "File not found"}), 404
    try:
        if os.path.exists(f.storage_path):
            os.remove(f.storage_path)
        db.session.delete(f)
        db.session.commit()
        return jsonify({"message": f"File '{f.filename}' deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error: {str(e)}"}), 500


# --- ADMIN MANAGEMENT ---
@api_bp.route('/admin/users', methods=['GET'])
@token_required
@roles_required(['admin'])
def get_all_users():
    user = getattr(g, 'current_user', None)
    if not user:
        return jsonify({"message": "Auth failed"}), 401
    users = User.query.filter_by(company_id=user.company_id).all()
    return jsonify([{
        "id": u.id,
        "employee_id": u.employee_id,
        "name": u.name,
        "role": u.role,
        "is_deactivated": u.is_deactivated
    } for u in users]), 200


@api_bp.route('/admin/deactivate_user', methods=['POST'])
@token_required
def deactivate_user():
    u = getattr(g, 'current_user', None)
    if not u or u.role != "admin":
        return jsonify({"message": "Admin only"}), 403
    data = request.get_json(silent=True) or {}
    emp_id = data.get('employee_id')
    if not emp_id:
        return jsonify({"message": "Missing employee_id"}), 400
    if emp_id == u.employee_id:
        return jsonify({"message": "Cannot deactivate self"}), 403
    target = User.query.filter_by(employee_id=emp_id, company_id=u.company_id).first()
    if not target:
        return jsonify({"message": "Not found"}), 404
    target.is_deactivated = True
    db.session.commit()
    return jsonify({"message": f"User {emp_id} deactivated"}), 200
