#from app import db, bcrypt 
from datetime import datetime
from backend.extensions import db, bcrypt


# --- Database Models ---
class Company(db.Model):
    """
    Stores company information for authentication.
    """
    __tablename__ = 'company'
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)

    def __repr__(self):
        return f"<Company {self.company_id}>"


class User(db.Model):
    """
    Stores user authentication and role data.
    """
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(80), unique=True, nullable=False) # Unique ID for login
    name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), default='employee', nullable=False)
    company_id = db.Column(db.String(80), nullable=False) 
    password_hash = db.Column(db.String(128), nullable=False)
    is_deactivated = db.Column(db.Boolean, default=False, nullable=False) 

    # Relationship for files uploaded by this user
    files = db.relationship('File', backref='uploader', lazy=True)

    def set_password(self, password):
        """Hashes the password using Bcrypt."""
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        """Checks the provided password against the hashed password."""
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.employee_id} - {self.company_id} - {self.role}>'

class File(db.Model):
    """
    Stores metadata for uploaded CSV files.
    """
    __tablename__ = 'file'
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    storage_path = db.Column(db.String(500), nullable=False) 
    
    company_id = db.Column(db.String(80), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    uploader_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) 
    uploader_employee_id = db.Column(db.String(80), nullable=False) 

    def __repr__(self):
        return f'<File {self.filename} - Uploader: {self.uploader_employee_id}>'
