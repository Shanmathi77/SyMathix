from flask import Flask
from flask_cors import CORS
from backend.extensions import db, bcrypt
from backend.routes import api_bp
import os
import logging


def create_app():
    """Application factory function: creates and configures the Flask application."""
    app = Flask(__name__)

    # Database configuration
    app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql+psycopg2://postgres:postgres123@localhost:5432/salesdb"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.environ.get('SECRET_KEY', 'a_secure_default_key_for_analytics')
    app.config['UPLOAD_FOLDER'] = 'uploads'
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Max upload size (16MB)

    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    CORS(app)  # Enable CORS for frontend running on a different port

    # Setup basic logging
    logging.basicConfig(level=logging.INFO)

    # Ensure the upload directory exists
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    # --- Register Blueprints (Routes) ---
    app.register_blueprint(api_bp)

    return app


if __name__ == '__main__':
    app = create_app()

    from backend.models import User  # ✅ fixed import

    with app.app_context():
        db.create_all()

        # Create default admin user if none exists
        if User.query.filter_by(employee_id='admin', company_id='DEFAULT').first() is None:
            admin_user = User(
                employee_id='admin',
                name='System Admin',
                role='admin',
                company_id='DEFAULT'
            )
            admin_user.set_password('adminpass')
            db.session.add(admin_user)
            db.session.commit()
            print("✅ Default admin user created: employee_id='admin', password='adminpass'")

    app.run(debug=True, port=5000)
