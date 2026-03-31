"""
sync_sheet.py
─────────────────────────────────────────────────────────────────
Fetches ALL tabs from a Google Sheet.
Each tab name like "TL Connect March" becomes a separate MongoDB
collection: TL_Connect_March inside CompanyDB.

HOW TO RUN:
    pip install -r requirements.txt
    python sync_sheet.py

SCHEDULE (run every 30 min via cron):
    */30 * * * * python3 /path/to/sync_sheet.py >> /tmp/sync.log 2>&1
"""

import os
import re
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv
from datetime import datetime

# ── Load env ──────────────────────────────────────────────────
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

MONGO_URI        = os.getenv('MONGO_URI')
SHEET_ID         = os.getenv('https://docs.google.com/spreadsheets/d/1XD1x9VeyGbGnCKw2w8pAlsf6zoxs59OSKxpRDcgmZ6U/edit?gid=1583998855#gid=1583998855')
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), 'google_credentials.json')

# ── Validate ──────────────────────────────────────────────────
if not MONGO_URI:
    raise ValueError("MONGO_URI not set in .env")
if not SHEET_ID:
    raise ValueError("GOOGLE_SHEET_ID not set in .env")
if not os.path.exists(CREDENTIALS_FILE):
    raise FileNotFoundError(f"google_credentials.json not found at: {CREDENTIALS_FILE}")

# ── Connect MongoDB ───────────────────────────────────────────
mongo_client = MongoClient(MONGO_URI)
db           = mongo_client['CompanyDB']

# ── Connect Google Sheets ─────────────────────────────────────
scope = [
    'https://spreadsheets.google.com/feeds',
    'https://www.googleapis.com/auth/drive'
]
creds      = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS_FILE, scope)
gc         = gspread.authorize(creds)
spreadsheet = gc.open_by_key(SHEET_ID)

# ── Get all worksheet tabs ────────────────────────────────────
worksheets = spreadsheet.worksheets()
print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Found {len(worksheets)} sheet tab(s):\n")
for ws in worksheets:
    print(f"  → {ws.title}")

# ── Helper: tab name → collection name ───────────────────────
def tab_to_collection(tab_name: str) -> str:
    """
    'TL Connect March' → 'TL_Connect_March'
    'TL connect march 2025' → 'TL_Connect_March_2025'
    Strips special chars, replaces spaces with underscores.
    """
    clean = re.sub(r'[^\w\s]', '', tab_name)   # remove special chars
    clean = re.sub(r'\s+', '_', clean.strip())  # spaces → underscores
    return clean

# ── Unique key column — phone number ─────────────────────────
# Update this list to match your sheet's phone column header exactly
PHONE_COLUMNS = [
    'Phone Number', 'phone', 'Phone', 'Mobile', 'mobile',
    'Contact', 'contact', 'Customer Number', 'Number',
    'Mobile Number', 'Phone no', 'Phone No'
]

def find_phone_key(row: dict) -> str | None:
    for col in PHONE_COLUMNS:
        if col in row and row[col]:
            return col
    return None

# ── Process each tab ─────────────────────────────────────────
total_inserted = 0
total_updated  = 0

for ws in worksheets:
    tab_name        = ws.title
    collection_name = tab_to_collection(tab_name)

    print(f"\n{'─'*55}")
    print(f"  Tab       : {tab_name}")
    print(f"  Collection: {collection_name}")

    try:
        rows = ws.get_all_records()
    except Exception as e:
        print(f"  ⚠️  Could not read tab '{tab_name}': {e}")
        continue

    if not rows:
        print(f"  ⚠️  Empty tab, skipping.")
        continue

    print(f"  Rows      : {len(rows)}")
    print(f"  Columns   : {list(rows[0].keys())}")

    # Find the phone column for this tab
    phone_col = find_phone_key(rows[0])
    if not phone_col:
        print(f"  ⚠️  No phone column found. Using row index as key.")

    collection = db[collection_name]
    operations = []

    for idx, row in enumerate(rows):
        # Clean whitespace
        cleaned = {
            k.strip(): (v.strip() if isinstance(v, str) else v)
            for k, v in row.items()
        }
        cleaned['_tab']       = tab_name
        cleaned['_synced_at'] = datetime.utcnow()

        # Determine unique key
        if phone_col and cleaned.get(phone_col):
            match_filter = { phone_col: str(cleaned[phone_col]) }
        else:
            # fallback: use row index
            match_filter = { '_row_index': idx }
            cleaned['_row_index'] = idx

        operations.append(
            UpdateOne(match_filter, { '$set': cleaned }, upsert=True)
        )

    if operations:
        result = collection.bulk_write(operations)
        total_inserted += result.upserted_count
        total_updated  += result.modified_count
        print(f"  ✅ Inserted: {result.upserted_count}  |  Updated: {result.modified_count}")
    else:
        print(f"  ⚠️  No operations to perform.")

# ── Summary ───────────────────────────────────────────────────
print(f"\n{'═'*55}")
print(f"  SYNC COMPLETE")
print(f"  Total Inserted : {total_inserted}")
print(f"  Total Updated  : {total_updated}")
print(f"  Collections    : {[tab_to_collection(ws.title) for ws in worksheets]}")
print(f"{'═'*55}\n")

mongo_client.close()
