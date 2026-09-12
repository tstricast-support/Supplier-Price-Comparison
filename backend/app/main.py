from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.config import settings
from app.routers import price_matrix, suppliers, admin, navigation,search

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Supplier Price Comparison System",
    description="Browse departments -> items -> vendors, and compare unit prices.",
    version="2.0.0",
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
app.include_router(navigation.router)
app.include_router(search.router)



@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok"}
