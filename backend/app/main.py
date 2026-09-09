from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.config import settings
from app.routers import price_matrix, suppliers, admin

# Create tables if they don't exist (use Alembic migrations in real production)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Supplier Price Comparison System",
    description="Compare supplier prices by unit price across products/departments.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(price_matrix.router)
app.include_router(suppliers.router)
app.include_router(admin.router)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok"}
