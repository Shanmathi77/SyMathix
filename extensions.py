from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

# Initialize extensions globally but unattached
db = SQLAlchemy()
bcrypt = Bcrypt()