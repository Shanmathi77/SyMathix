# inspect_db.py
from backend.app import app
from backend.extensions import db
from backend.models import User, File

with app.app_context():
    print("SQLALCHEMY_DATABASE_URI:", app.config.get('SQLALCHEMY_DATABASE_URI'))
    print("Users count:", User.query.count())
    print("Admins:", [u.employee_id for u in User.query.filter_by(role='admin').all()])
    print("Files count:", File.query.count())
    print("First user rows (limit 5):", [(u.id, u.employee_id, u.name, u.company_id) for u in User.query.limit(5).all()])
