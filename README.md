# Pharmacy-Management-System
# Helix Pharmacy Management System (PMS)

A modern, full-stack web application designed for single-store pharmacy operations: inventory management, supplier and customer records, point-of-sale billing with live stock deduction, real-time expiry & low-stock tracking, operational reporting, and role-based access control.

The system is strictly built according to [SRS.md](SRS.md) and [REQUIREMENTS.md](REQUIREMENTS.md).

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+) |
| **Database** | SQLite (`pharmacy.db`, auto-created and seeded on first launch) |
| **ORM** | SQLAlchemy 2.0 (Declarative Mapped models) |
| **Authentication** | JWT (JSON Web Tokens via python-jose, PBKDF2 password hashing) |
| **Frontend** | Modern Vanilla HTML5, CSS3 (Custom design system), ES6+ JavaScript |
| **Server** | Uvicorn (ASGI server serving both REST API and static frontend) |
| **Testing** | Pytest + Starlette/FastAPI TestClient |

---

## Features Implemented

1. **Authentication & Role-Based Access Control**:
   - Secure login generating 8-hour JWT Bearer tokens (**FR-01**, **FR-02**, **NFR-02**).
   - Unified invalid credential error response preventing enumeration (**FR-05**).
   - Role enforcement (**SRS 2.2**):
     - **Admin**: Full access including deletion of unused medicines, suppliers, and customers.
     - **Pharmacist**: Complete access to dashboard, medicines, customers, sales billing, and reports; restricted from deleting medicines or suppliers (returns `403 Forbidden`).

2. **Dashboard & Alert Intelligence**:
   - Real-time KPI cards: Total medicines, suppliers, customers, today's sales revenue, and monthly cumulative revenue (**FR-06**).
   - Health alerts: Low stock count, 30-day expiry count, expired stock count (**FR-07**).
   - Actionable alert panels: Low-stock threshold table with quick Restock action, 30-day expiring medication list, and recent invoices ledger (**FR-08**).

3. **Medicine Inventory Management**:
   - Full CRUD for medicines with 10 standard fields (**FR-11**).
   - Live debounced multi-field search matching name, generic name, category, manufacturer, and batch number (**FR-12**).
   - Validation against negative quantity, negative unit price, and duplicate batch numbers for the same medicine name (**FR-13**, **FR-32**).
   - Admin-only deletion protection: medicines appearing on sales cannot be deleted (**FR-10**).

4. **Suppliers & Customers**:
   - Supplier CRUD and multi-field search (name, contact person, phone, email) (**FR-14**, **FR-16**). Deletion blocked if supplier has linked medicines (**FR-15**).
   - Customer CRUD and multi-field search (**FR-17**, **FR-18**). Deletion blocked if customer has sales records (**FR-19**).
   - Client and server validation for phone and email formats (**FR-31**, **FR-33**).

5. **Sales Billing & Invoicing (POS)**:
   - Dynamic multi-item sales creation with customer selection (walk-in allowed without customer) (**FR-20**, **FR-26**).
   - Payment method support (Cash, Card, UPI).
   - Live inventory validation: prevents overselling beyond available stock (**FR-22**).
   - Immediate stock deduction upon transaction completion (**FR-23**).
   - Professional printable receipt / invoice detail view (**FR-24**).
   - Immutability: sale records cannot be edited or deleted after creation (**FR-25**).

6. **Comprehensive Reports Module**:
   - **Sales Report**: Filterable by Date From and Date To with transaction count, period revenue, and itemized sales (**FR-27**).
   - **Inventory Valuation Report**: Total inventory valuation ($\sum \text{Qty} \times \text{Price}$) with itemized stock values (**FR-28**).
   - **Expiry Report**: Categorized tables for expired and expiring-soon (within 30 days) medications sorted chronologically (**FR-29**).
   - **Low Stock Report**: Sorted by lowest stock with deficit calculation and supplier contact info (**FR-30**).

---

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Git (optional)

### Setup Virtual Environment

1. Navigate to the project root directory:
   ```bash
   cd PROMPT
   ```

2. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```

3. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD)**:
     ```cmd
     .\.venv\Scripts\activate.bat
     ```
   - **macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## Running the Application

### Option A: One-Click Launchers (Easiest)

- **Windows Batch**: Double-click [`run.bat`](run.bat) or run in terminal:
  ```cmd
  .\run.bat
  ```
- **PowerShell**: Run [`run.ps1`](run.ps1):
  ```powershell
  .\run.ps1
  ```

---

### Option B: Run Directly Using the Virtual Environment

You can run `uvicorn` directly through the virtual environment without needing manual activation:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
or
```powershell
.\.venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

### Option C: Activate Virtual Environment First

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

*(Note: If PowerShell displays an `Execution_Policies` restriction when activating, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`, or simply use Option A or B which do not require changing execution policies).*

Once started:
- **Web Application**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

> **Note**: On the first run, the SQLite database (`pharmacy.db`) will automatically be initialized and populated with demo medicines, suppliers, customers, and test sales.

---

## Default Demo Accounts

| Role | Username | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full access across all modules, including deletion of unused records. |
| **Pharmacist** | `pharmacist` | `pharma123` | Operational access; can delete customers without sales, cannot delete medicines or suppliers. |

*(Quick-login chips are provided directly on the sign-in screen for one-click demo access).*

---

## Running Automated Tests

Run the full pytest suite:

```powershell
pytest -v
```

Or run in quiet mode:

```powershell
pytest -q
```

All 7 test suites verify:
- Authentication & JWT token issuance/rejection.
- Role-based deletion constraints (Admin vs. Pharmacist).
- Foreign key deletion protections (medicines on sales, suppliers with medicines, customers with sales).
- Medicine duplicate batch rejection and negative value validation.
- Phone and email validation formats.
- Sales billing stock deduction, oversell prevention, and invoice retrieval.
- Dashboard metrics and all 4 reporting endpoints.

---

## Project Structure

```
PROMPT/
├── app/
│   ├── __init__.py        # DB initialization and startup hooks
│   ├── auth.py            # Password hashing (PBKDF2), JWT encode/decode, role checks
│   ├── database.py        # SQLAlchemy engine and SessionLocal setup
│   ├── main.py            # FastAPI app declaration, CORS, static file mounts
│   ├── models.py          # SQLAlchemy ORM models (User, Medicine, Supplier, Customer, Sale, SaleItem)
│   ├── routers.py         # REST API endpoints (/api/auth, /api/medicines, /api/sales, etc.)
│   ├── schemas.py         # Pydantic validation schemas & request/response contracts
│   └── seed.py            # Initial demo data seeder
├── frontend/
│   ├── app.js             # Client-side SPA routing, API fetch, UI rendering, forms
│   ├── index.html         # Semantic HTML5 application shell & modal containers
│   └── styles.css         # Modern responsive CSS design system & print stylesheet
├── tests/
│   └── test_api.py        # Comprehensive automated API integration tests
├── pytest.ini             # Pytest configuration (pythonpath = .)
├── requirements.txt       # Python dependencies
├── REQUIREMENTS.md        # Traceability matrix and acceptance checklist
├── SRS.md                 # Software Requirements Specification (Source of truth)
└── README.md              # Project documentation
```