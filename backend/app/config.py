from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/supplier_price_db"
    CORS_ORIGINS: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "https://luminous-bravery-production-8d97.up.railway.app"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        """
        Normalizes DATABASE_URL so it always works with SQLAlchemy, regardless
        of exactly what format the hosting platform hands us:
          - Some platforms (Railway, Heroku, etc.) still give "postgres://",
            which SQLAlchemy 2.x rejects outright - upgrade it to "postgresql://".
          - If you're on psycopg2-binary (the default here), the plain
            "postgresql://" scheme is correct as-is.
          - If you switch to the psycopg3 driver (`psycopg[binary]` in
            requirements.txt) because psycopg2 won't build on your Python
            version, this rewrites the scheme to "postgresql+psycopg://"
            automatically - so you only ever have to change one line
            (USE_PSYCOPG3 below), never the Railway env var itself.
        """
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)

        if self.USE_PSYCOPG3 and url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)

        return url

    # Flip this to True only if you've switched requirements.txt to use
    # `psycopg[binary]` instead of `psycopg2-binary` (e.g. because psycopg2
    # wouldn't build on your Python version). Leave False if you're still
    # on psycopg2-binary.
    USE_PSYCOPG3: bool = True

    class Config:
        env_file = ".env"


settings = Settings()