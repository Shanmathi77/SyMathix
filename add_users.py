from app import create_app
from extensions import db
from models import User, Company

app = create_app()

with app.app_context():
    # ✅ Step 1: Check if company already exists
    company = Company.query.filter_by(company_id='Intellibotics').first()
    if not company:
        company = Company(company_id='Intellibotics', password='1234567')
        db.session.add(company)
        db.session.commit()
        print("✅ Company 'Intellibotics' created.")
    else:
        print("ℹ️ Company 'Intellibotics' already exists, skipping creation.")

    # ✅ Step 2: Create admin Syed
    existing_admin = User.query.filter_by(employee_id='07', company_id='Intellibotics').first()
    if not existing_admin:
        admin_user = User(
            employee_id='07',
            name='Syed',
            role='admin',
            company_id='Intellibotics'
        )
        admin_user.set_password('syed123')
        db.session.add(admin_user)
        print("✅ Admin Syed added.")
    else:
        print("ℹ️ Admin Syed already exists, skipping.")

    # ✅ Step 3: Create employee Sri
    existing_emp = User.query.filter_by(employee_id='08', company_id='Intellibotics').first()
    if not existing_emp:
        employee_user = User(
            employee_id='08',
            name='Sri',
            role='employee',
            company_id='Intellibotics'
        )
        employee_user.set_password('sri123')
        db.session.add(employee_user)
        print("✅ Employee Sri added.")
    else:
        print("ℹ️ Employee Sri already exists, skipping.")

    db.session.commit()
    print("🎉 All users processed successfully!")
