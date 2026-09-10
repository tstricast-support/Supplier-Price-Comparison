"""
Seeds/repairs the four fixed departments this system uses:
  I LAB, I PHOTOBOOK, I LAB STD, DD ENGINEERING

Safe to re-run: it only adds departments that are missing (matched by
`code`, a stable internal key), it never renames or deletes existing rows,
so any products/vendors already linked to an old department are untouched.

NOTE: `code` is a new column on `departments`. If you're upgrading an
existing database (not a fresh one), run this once first:
    ALTER TABLE departments ADD COLUMN code VARCHAR(50);
Base.metadata.create_all() only creates missing TABLES, it will not add
columns to a table that already exists.
"""
from app.database import SessionLocal, engine, Base
from app import models

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# (code, display name shown in the UI)
DEPARTMENTS = [
    ("i_lab", "I LAB"),
    ("i_photobook", "I PHOTOBOOK"),
    ("i_lab_std", "I LAB STD"),
    ("dd_engineering", "DD ENGINEERING"),
]

try:
    for code, name in DEPARTMENTS:
        exists = (
            db.query(models.Department)
            .filter((models.Department.code == code) | (models.Department.name == name))
            .first()
        )
        if not exists:
            db.add(models.Department(code=code, name=name))
        elif exists.code is None:
            # Backfill the code on a department that was created before this field existed
            exists.code = code
    db.commit()
    print("Departments ready: I LAB, I PHOTOBOOK, I LAB STD, DD ENGINEERING")
finally:
    db.close()
