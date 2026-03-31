"""
sync_sheet.py
Fetches ALL tabs from multiple Google Sheets.
Each tab becomes a separate MongoDB collection in CompanyDB.
Sheet 1: VV - Tide Link Onboarding  (TL Connect data)
Sheet 2: MSME & Insurance data
"""

import os, re, certifi, gspread
from oauth2client.service_account import ServiceAccountCredentials
from pymongo import MongoClient, UpdateOne
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH   = os.path.join(SCRIPT_DIR, '../.env')

MONGO_URI   = None
SHEET_ID_1  = None
SHEET_ID_2  = None

with open(ENV_PATH) as f:
    for line in f:
        line = line.strip()
        if '=' not in line or line.startswith('#'): continue
        key, val = line.split('=', 1)
        key = key.strip(); val = val.strip()
        if key == 'MONGO_URI':          MONGO_URI  = val
        if key == 'GOOGLE_SHEET_ID':    SHEET_ID_1 = val
        if key == 'GOOGLE_SHEET_ID_2':  SHEET_ID_2 = val

MONGO_URI  = os.environ.get('MONGO_URI',  MONGO_URI)
SHEET_ID_1 = os.environ.get('GOOGLE_SHEET_ID',   SHEET_ID_1)
SHEET_ID_2 = os.environ.get('GOOGLE_SHEET_ID_2', SHEET_ID_2)

CREDENTIALS_FILE = os.path.join(SCRIPT_DIR, 'google_credentials.json')

if not MONGO_URI:   raise ValueError("MONGO_URI not found")
if not SHEET_ID_1:  raise ValueError("GOOGLE_SHEET_ID not found")

# Connect MongoDB
mongo_client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
db = mongo_client['CompanyDB']

# Connect Google Sheets
scope = ['https://spreadsheets.google.com/feeds','https://www.googleapis.com/auth/drive']
creds = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS_FILE, scope)
gc    = gspread.authorize(creds)

def tab_to_collection(name):
    clean = re.sub(r'[^\w\s]', '', name)
    return re.sub(r'\s+', '_', clean.strip())

def clean_key(k):
    return k.strip().replace('.', '_').replace('$', '_').replace(' ', '_')

PHONE_COLS = ['Phone_Number','phone','Phone','Mobile','mobile','Contact','Customer_Number',
              'Number','Mobile_Number','Merchant_Number','Mobile_No_','Mobile No_']

total_ins = total_upd = 0

def sync_spreadsheet(sheet_id, label):
    global total_ins, total_upd
    print(f"\n{'='*55}")
    print(f"  Syncing: {label} ({sheet_id})")
    print(f"{'='*55}")
    try:
        spreadsheet = gc.open_by_key(sheet_id)
    except Exception as e:
        print(f"  ERROR opening sheet: {e}")
        return

    worksheets = spreadsheet.worksheets()
    print(f"  Found {len(worksheets)} tab(s):")
    for ws in worksheets:
        print(f"    -> {ws.title}")

    for ws in worksheets:
        tab = ws.title
        col = tab_to_collection(tab)
        print(f"\n  --- {tab} -> {col}")
        try:
            rows = ws.get_all_records()
        except Exception as e:
            print(f"  Error reading tab: {e}"); continue
        if not rows:
            print("  Empty, skip"); continue
        print(f"  Rows: {len(rows)}  Cols: {list(rows[0].keys())[:6]}")

        phone_col = next((clean_key(c) for c in rows[0].keys() if clean_key(c) in PHONE_COLS), None)
        collection = db[col]
        ops = []

        for idx, row in enumerate(rows):
            cleaned = {clean_key(k): (v.strip() if isinstance(v, str) else v) for k, v in row.items()}
            cleaned['_tab']       = tab
            cleaned['_sheet']     = label
            cleaned['_synced_at'] = datetime.now(timezone.utc)

            filt = {phone_col: str(cleaned[phone_col])} if phone_col and cleaned.get(phone_col) else {'_row_index': idx}
            if not phone_col: cleaned['_row_index'] = idx
            ops.append(UpdateOne(filt, {'$set': cleaned}, upsert=True))

        if ops:
            r = collection.bulk_write(ops)
            total_ins += r.upserted_count
            total_upd += r.modified_count
            print(f"  Inserted: {r.upserted_count} | Updated: {r.modified_count}")

# Sync Sheet 1 — Tide Connect
sync_spreadsheet(SHEET_ID_1, "VV - Tide Link Onboarding")

# Sync Sheet 2 — MSME & Insurance (only if ID is set)
if SHEET_ID_2:
    sync_spreadsheet(SHEET_ID_2, "VV - MSME & Insurance")
else:
    print("\nGOOGLE_SHEET_ID_2 not set — skipping second sheet")

print(f"\n{'='*55}")
print(f"  SYNC COMPLETE")
print(f"  Total Inserted : {total_ins}")
print(f"  Total Updated  : {total_upd}")
print(f"{'='*55}\n")

mongo_client.close()


# ── EXCEL FILE SYNC (Sheet 2 — MSME & Insurance) ──────────────
import io, requests, openpyxl

EXCEL_RELEVANT = ['MSME MARCH','INSURANCE MARCH','MSME FEB26','INSURANCE FEB26',
                  'TL CONNECT MARCH','TL CONNECT FEB26']

if SHEET_ID_2:
    print(f"\n{'='*55}\n  BC Onboarding Report (Excel)\n{'='*55}")
    try:
        scope2 = ['https://www.googleapis.com/auth/drive']
        creds2 = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS_FILE, scope2)
        creds2.get_access_token()
        token2 = creds2.access_token
        resp = requests.get(f'https://www.googleapis.com/drive/v3/files/{SHEET_ID_2}?alt=media',
            headers={'Authorization': f'Bearer {token2}'}, verify=certifi.where())
        wb = openpyxl.load_workbook(io.BytesIO(resp.content), read_only=True, data_only=True)

        for sheet_name in EXCEL_RELEVANT:
            if sheet_name not in wb.sheetnames: continue
            ws  = wb[sheet_name]
            col = tab_to_collection(sheet_name)
            print(f"\n  --- {sheet_name} -> {col}")
            rows = list(ws.iter_rows(values_only=True))
            if not rows: continue
            header_row_idx = next((i for i,r in enumerate(rows) if any(v for v in r)), 0)
            raw_headers = rows[header_row_idx]
            headers = []; seen = {}
            for h in raw_headers:
                ck = clean_key(h) if h else None
                if not ck: headers.append(None); continue
                if ck in seen: seen[ck]+=1; ck=f"{ck}_{seen[ck]}"
                else: seen[ck]=0
                headers.append(ck)
            data_rows = rows[header_row_idx+1:]
            valid_h = [h for h in headers if h]
            PCOLS = ['Phone_Number','Mobile_Number','Mobile_No_','Mobile','phone','Number']
            phone_col = next((h for h in valid_h if h in PCOLS), None)
            print(f"  Rows:{len(data_rows)} Phone:{phone_col}")
            collection = db[col]
            ops = []
            for idx, row in enumerate(data_rows):
                if all(v is None or str(v).strip()=='' for v in row): continue
                cleaned = {h:(str(v).strip() if isinstance(v,str) else v) for h,v in zip(headers,row) if h}
                cleaned['_tab']=sheet_name; cleaned['_sheet']='BC Onboarding Report'
                cleaned['_synced_at']=datetime.now(timezone.utc)
                filt = {phone_col:str(cleaned[phone_col])} if phone_col and cleaned.get(phone_col) else {'_row_index':idx}
                if not phone_col: cleaned['_row_index']=idx
                ops.append(UpdateOne(filt,{'$set':cleaned},upsert=True))
            if ops:
                r2 = collection.bulk_write(ops)
                total_inserted+=r2.upserted_count; total_updated+=r2.modified_count
                print(f"  Inserted:{r2.upserted_count} Updated:{r2.modified_count}")
    except Exception as e:
        print(f"  Excel sync error: {e}")
