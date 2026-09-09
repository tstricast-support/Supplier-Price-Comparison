from app.database import SessionLocal, engine, Base
from app import models

Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    dept_names = ["tricast", "ilab", "i_photobook", "ilab_std"]
    for name in dept_names:
        exists = db.query(models.Department).filter_by(name=name).first()
        if not exists:
            db.add(models.Department(name=name))
    db.commit()
    print("Departments added.")
finally:
    db.close()