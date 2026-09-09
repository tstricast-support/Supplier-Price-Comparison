# Supplier Price Comparison System

FastAPI + PostgreSQL backend, React (Vite + Tailwind) frontend.
**No login/authentication** — everyone has full read/write access, including price edits and price history.

## Project structure

```
supplier-price-system/
├── backend/          FastAPI app
│   ├── app/
│   │   ├── main.py           entrypoint
│   │   ├── config.py         env-based settings
│   │   ├── database.py       SQLAlchemy engine/session
│   │   ├── models.py         departments, products, suppliers, supplier_products, price_history
│   │   ├── schemas.py        Pydantic request/response models
│   │   └── routers/
│   │       ├── price_matrix.py   GET /api/price-matrix, /api/departments
│   │       ├── suppliers.py      GET /api/suppliers, /api/suppliers/{id}/products
│   │       └── admin.py          POST/PUT/DELETE supplier-products, GET history
│   ├── seed.py        demo data (matches the 30m/50m canvas roll example)
│   ├── requirements.txt
│   └── .env.example
└── frontend/          React app
    ├── src/
    │   ├── App.jsx              tab navigation
    │   ├── api/
    │   │   ├── client.js         axios instance
    │   │   └── endpoints.js      all API calls
    │   └── components/
    │       ├── MatrixTable.jsx       search + department filter + comparison table
    │       ├── SupplierView.jsx      per-supplier product list
    │       ├── EditPriceModal.jsx    update price (open to anyone)
    │       └── PriceHistoryModal.jsx audit trail viewer
    ├── package.json
    └── .env.example
```

## 1. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env with your real PostgreSQL connection string, e.g.:
# DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/supplier_price_db
```

Create the database first (PostgreSQL must be running):

```bash
createdb supplier_price_db
# or via psql:
psql -U postgres -c "CREATE DATABASE supplier_price_db;"
```

Load demo data (also auto-creates all tables):

```bash
python seed.py
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

- API root: http://localhost:8000
- Interactive docs (Swagger UI): http://localhost:8000/docs

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# edit .env if your API isn't on localhost:8000:
# VITE_API_BASE_URL=http://localhost:8000

npm run dev
```

Open http://localhost:5173

## How the core logic works

- **Unit price** = `total_price / total_length_or_quantity`, computed server-side and stored on `supplier_products.unit_price` whenever a price is created or updated.
- **Matrix endpoint** (`GET /api/price-matrix`) groups all supplier offers per product, sorts each product's offers ascending by `unit_price`, and marks the first one `is_cheapest: true`. Rows themselves are also sorted so the overall best deals surface first.
- **Price history**: whenever `PUT /api/admin/supplier-products/{id}` changes `total_price`, a row is written to `price_history` with the old price, new price, and timestamp. Since there's no login, you can optionally pass `"changed_by": "Jane"` in the request body to label who made the change (defaults to `"staff"`).

## API quick reference

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/departments` | List departments (for the filter dropdown) |
| GET | `/api/price-matrix?department_id=&search=` | Matrix data, sorted by cheapest unit price |
| GET | `/api/suppliers` | List all suppliers |
| GET | `/api/suppliers/{id}/products` | All products/prices for one supplier |
| POST | `/api/admin/suppliers` | Create a supplier |
| POST | `/api/admin/products` | Create a product |
| POST | `/api/admin/supplier-products` | Create a new price offering |
| PUT | `/api/admin/supplier-products/{id}` | Update price/qty → auto-logs history |
| GET | `/api/admin/supplier-products/{id}/history` | View price change audit trail |
| DELETE | `/api/admin/supplier-products/{id}` | Remove a price offering |

(The `/api/admin/...` prefix is kept for clarity/organization only — these routes are **not** access-restricted.)

## Notes for production

- Replace `Base.metadata.create_all()` in `main.py` with proper Alembic migrations for schema changes.
- Since there's no auth, anyone with network access to the API can edit prices — put this behind your internal network / VPN, or add auth back later if needed (the codebase was originally built with JWT + RBAC, so it's straightforward to reintroduce).
- Set specific `CORS_ORIGINS` in production instead of `*`.
