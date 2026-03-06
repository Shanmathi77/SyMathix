from flask import request, jsonify, g, current_app
from functools import wraps
from backend.models import User # We need to access the User model to look up the credentials

def token_required(f):
   
    @wraps(f)
    def decorated(*args, **kwargs):
        employee_id = request.headers.get('X-Employee-Id')
        company_id = request.headers.get('X-Company-Id')

        if not employee_id or not company_id:
            return jsonify({'message': 'Authorization required (Missing required headers X-Employee-Id/X-Company-Id)'}), 401

        user = User.query.filter_by(employee_id=employee_id, company_id=company_id).first()
        if not user or user.is_deactivated:
            return jsonify({'message': 'Invalid credentials or user deactivated'}), 401

        g.user = user
        g.current_user = user   # <- compatibility: your routes expect this name
        return f(*args, **kwargs)
    return decorated

def roles_required(allowed_roles):
    """
    RBAC Decorator: Checks if the authenticated user's role is in the allowed list.
    Must be used *after* a decorator that sets g.user (like token_required).
    """
    def decorator(f):
        @wraps(f)
        @token_required # Ensure authentication is performed first
        def decorated_function(*args, **kwargs):
            # Check if the authenticated user's role is in the list of allowed roles
            if g.user.role not in allowed_roles:
                current_app.logger.warning(f"Access attempt by user {g.user.employee_id} ({g.user.role}) to restricted resource.")
                return jsonify({'message': 'Permission denied. Role not authorized.'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
