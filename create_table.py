from backend.app import app, db
from backend.models import User 

with app.app_context(): 
    db.create_all() 
    print("All tables created successfully!")