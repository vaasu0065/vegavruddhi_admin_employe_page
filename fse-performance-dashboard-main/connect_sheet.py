import re
import calendar
import gspread
import pandas as pd
from oauth2client.service_account import ServiceAccountCredentials
from concurrent.futures import ThreadPoolExecutor

SPREADSHEET = "VV - Day Working (Responses)"
_DATE_RE = re.compile(r"^(\d{2})-(\d{2})-(\d{4})$")


def _get_client():
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]
    creds = ServiceAccountCredentials.from_json_keyfile_name("credentials.json", scope)
    return gspread.authorize(creds)


def _dedup_columns(cols):
    seen = {}
    result = []
    for c in cols:
        if c in seen:
            seen[c] += 1
            result.append(f"{c}_{seen[c]}")
        else:
            seen[c] = 0
            result.append(c)
    return result


def _get_date_cols_by_month(df: pd.DataFrame) -> dict:
    """
    Returns a dict mapping month_label → list of date column names.
    e.g. {"January 2026": ["01-01-2026", ...], "February 2026": [...]}
    """
    month_cols = {}
    for col in df.columns:
        m = _DATE_RE.match(str(col).strip())
        if m:
            month_num, year = int(m.group(1)), int(m.group(3))
            try:
                label = f"{calendar.month_name[month_num]} {year}"
                month_cols.setdefault(label, []).append(col)
            except Exception:
                pass
    return month_cols


def _tag_row_months(df: pd.DataFrame) -> pd.Series:
    """
    For each row, determine which month it belongs to by finding which
    month's date columns have the highest total non-zero activity.
    Falls back to the dominant month if a row has no date data.
    """
    month_cols = _get_date_cols_by_month(df)
    if not month_cols:
        return pd.Series("", index=df.index)

    # Build score per month per row
    scores = {}
    for label, cols in month_cols.items():
        valid_cols = [c for c in cols if c in df.columns]
        if valid_cols:
            numeric = df[valid_cols].apply(pd.to_numeric, errors="coerce").fillna(0)
            scores[label] = numeric.sum(axis=1)

    if not scores:
        return pd.Series("", index=df.index)

    score_df = pd.DataFrame(scores, index=df.index)
    dominant = score_df.sum().idxmax()
    result = score_df.idxmax(axis=1)
    # Rows where all scores are 0 → assign dominant month
    all_zero = score_df.sum(axis=1) == 0
    result[all_zero] = dominant
    return result


def _load_worksheet(ws_name: str, client) -> pd.DataFrame:
    """Load one worksheet into a DataFrame (3-row header offset)."""
    try:
        ws = client.open(SPREADSHEET).worksheet(ws_name)
        data = ws.get_all_values()
        if len(data) < 4:
            print(f"[Sheet] '{ws_name}' too few rows, skipping.")
            return pd.DataFrame()
        df = pd.DataFrame(data)
        raw_cols = [str(c).strip() for c in df.iloc[2]]
        df.columns = _dedup_columns(raw_cols)
        df = df[3:].reset_index(drop=True)
        df = df.dropna(axis=1, how="all")
        df = df.loc[:, (df != "").any()]
        df["_source"] = ws_name
        # Tag each row with its actual month based on date column activity
        df["_month"] = _tag_row_months(df)
        months_found = df["_month"].unique().tolist()
        print(f"[Sheet] '{ws_name}': {len(df)} rows, months={months_found}")
        return df
    except Exception as e:
        print(f"[Sheet] Failed '{ws_name}': {e}")
        return pd.DataFrame()


def load_sheet() -> pd.DataFrame:
    """Load FSE + Old working in parallel, keep rows separate (no merging), return combined DataFrame."""
    client = _get_client()

    with ThreadPoolExecutor(max_workers=2) as pool:
        fut_fse = pool.submit(_load_worksheet, "FSE", client)
        fut_old = pool.submit(_load_worksheet, "Old working", client)
        fse_df = fut_fse.result()
        old_df = fut_old.result()

    if old_df.empty:
        return fse_df
    if fse_df.empty:
        return old_df

    # ── Align columns so both DataFrames have the same columns ───────────────
    all_cols = list(dict.fromkeys(list(fse_df.columns) + list(old_df.columns)))
    fse_df = fse_df.reindex(columns=all_cols, fill_value="")
    old_df = old_df.reindex(columns=all_cols, fill_value="")

    # ── Stack rows — keep each sheet's rows separate and intact ──────────────
    # We do NOT merge rows across sheets because product columns (Tide etc.)
    # are month-specific. Merging would mix March data with Jan/Feb data.
    combined = pd.concat([fse_df, old_df], ignore_index=True)
    print(f"[Sheet] Combined: {len(combined)} rows, {len(combined.columns)} cols")
    return combined
