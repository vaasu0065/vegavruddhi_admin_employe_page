# FSE Performance Dashboard

A full-stack performance analytics dashboard for Field Sales Executives (FSE) built with **FastAPI** (Python) backend and **React** frontend. Data is pulled live from Google Sheets and persisted historically.

---

## Tech Stack

- **Backend:** Python, FastAPI, Uvicorn, gspread, pandas
- **Frontend:** React, Material UI (MUI), Recharts
- **Data Source:** Google Sheets (via Service Account)
- **Persistence:** Local JSON (`historical_data.json`)

---

## Project Structure

```
FSE/
├── api_server.py              # FastAPI backend — main entry point
├── connect_sheet.py           # Google Sheets loader
├── feature_engineering.py     # Points calculation, product column detection
├── history_store.py           # Historical data persistence
├── clean_duplicates.py
├── smart_column_detection.py
├── handle_missing_values.py
├── convert_data_types.py
├── normalize_columns.py
├── credentials.json           # Google Service Account key (not committed)
├── historical_data.json       # Auto-generated historical store
└── fse-dashboard/             # React frontend
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.js       # Overview dashboard
    │   │   └── ProductDashboard.js # Tide & product analytics
    │   ├── components/
    │   │   ├── KPI.js
    │   │   ├── TLChart.js
    │   │   ├── TopEmployees.js
    │   │   ├── MeetingTrend.js
    │   │   ├── ProductChart.js
    │   │   ├── TideDrillTable.js
    │   │   ├── FiltersBar.js
    │   │   ├── EmployeeStatusPie.js
    │   │   └── EmploymentTypePie.js
    │   └── services/
    │       └── api.js             # Axios API calls to backend
    └── .env                       # Frontend env config
```

---

## Prerequisites

- Python 3.9+
- Node.js 18+
- A Google Cloud Service Account with Sheets API enabled
- `credentials.json` placed in the project root

---

## Setup & Running

### 1. Clone the repo

```bash
git clone https://github.com/your-username/fse-performance-dashboard.git
cd fse-performance-dashboard
```

### 2. Install Python dependencies

```bash
pip install fastapi uvicorn pandas gspread oauth2client openpyxl
```

### 3. Add Google credentials

Place your `credentials.json` (Google Service Account key) in the project root. Share your Google Sheet with the service account email.

### 4. Start the backend

```bash
python api_server.py
```

Backend runs at: `http://127.0.0.1:8001`

### 5. Install frontend dependencies

```bash
cd fse-dashboard
npm install
```

### 6. Configure frontend environment

The `fse-dashboard/.env` file should contain:

```
REACT_APP_API_URL=http://127.0.0.1:8001
PORT=3001
```

### 7. Start the frontend

```bash
cd fse-dashboard
npm start
```

Frontend runs at: `http://localhost:3001`

---

## Features

### Overview Dashboard
- KPI cards — Total Employees, Meetings, Sales, Active count (click to drill down)
- Employee Status & Employment Type pie charts with click-to-explore employee lists
- Top 10 Employees by points (horizontal bar chart)
- Meeting Trend chart
- Team Leader Performance — vertical bar chart, click a bar to see that TL's team
- Month-over-Month comparison

### Product Dashboard (Tide Analytics)
- Dynamic Tide KPI strip — all Tide product columns auto-detected from sheet
- Other Products KPI strip — Vehicle Insurance, Vehicle Points Earned, Aditya Birla, Airtel Payments Bank, Hero FinCorp
- Smart filters — select employee to auto-fill TL, status, employment type; select TL to narrow employee list; disambiguation popup for duplicate names
- Custom Column Chart — pick any product columns, group by employee or TL, click a bar to see full employee KPI profile
- Onboarded Tide chart — condition changes per month (configurable in `api_server.py`)
- Tide Onboarding Conversion Rate by Month — uses correct onboard column per month
- Referral code analysis, UPI vs PPI, MSME, Insurance charts
- Inline editable table — click any value to edit and sync directly to Google Sheet

### Data
- Live pull from Google Sheets every 5 minutes (background cache refresh)
- Historical data merged across months using `_month` tag
- Deduplication by Email ID across all tables

---

## Monthly Onboard Column Config

When the onboarding condition changes for a new month, update `ONBOARD_COLUMN_BY_MONTH` in `api_server.py`:

```python
ONBOARD_COLUMN_BY_MONTH = {
    "January 2026":  "Tide OB with PP",
    "February 2026": "Tide OB with PP",
    "March 2026":    "Tide OB with PP + 5K QR Load + 4 Txns",
    # Add new months here
}
```

Then restart the backend:

```bash
python api_server.py
```

---

## Google Sheet Structure

- Spreadsheet: `VV - Day Working (Responses)`
- Current month worksheet: `FSE` (March)
- Historical worksheets: `Old working` (Jan/Feb)
- Header row is at row 3 (rows 1–2 are metadata)
- Required columns include: `Name`, `Email ID`, `TL`, `Employee status`, `Employment type`, `Tide OB with PP`, `Tide (All applied cases)`, etc.
