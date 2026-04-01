import json
import os
import pandas as pd

HISTORY_FILE = "historical_data.json"


def load_history() -> pd.DataFrame:
    """Load previously stored historical rows from JSON."""
    if not os.path.exists(HISTORY_FILE):
        return pd.DataFrame()
    try:
        with open(HISTORY_FILE, "r") as f:
            records = json.load(f)
        return pd.DataFrame(records)
    except Exception as e:
        print(f"[History] Failed to load history: {e}")
        return pd.DataFrame()


def save_history(df: pd.DataFrame):
    """Persist the full merged dataframe to JSON for future use."""
    try:
        # Convert all values to strings to keep JSON safe
        records = df.astype(str).to_dict(orient="records")
        with open(HISTORY_FILE, "w") as f:
            json.dump(records, f)
        print(f"[History] Saved {len(records)} rows to {HISTORY_FILE}")
    except Exception as e:
        print(f"[History] Failed to save history: {e}")


def merge_with_history(current_df: pd.DataFrame) -> pd.DataFrame:
    """
    Merge current sheet data with stored historical data.
    - connect_sheet.py already combines FSE + Old working into current_df.
    - This function additionally preserves any date columns that were in a
      previous run but have since been removed from the live sheets.
    - Identifies employees by Email ID (or Name as fallback).
    """
    history_df = load_history()

    if history_df.empty:
        # First run — just save what we have and return
        save_history(current_df)
        return current_df

    # Identify date columns in both dataframes
    def get_date_cols(df):
        date_cols = []
        for col in df.columns:
            try:
                d = pd.to_datetime(col, errors="raise")
                date_cols.append(col)
            except Exception:
                pass
        return date_cols

    current_date_cols = set(get_date_cols(current_df))
    history_date_cols = set(get_date_cols(history_df))

    # Columns only in history (previous months removed from sheet)
    old_date_cols = history_date_cols - current_date_cols

    # Non-date columns (identity + metadata)
    id_col = "Email ID" if "Email ID" in current_df.columns else "Name"

    # Add missing old date columns to current_df with 0
    for col in old_date_cols:
        current_df[col] = 0

    # For each row in current_df, fill in historical date values
    if id_col in history_df.columns and old_date_cols:
        history_lookup = history_df.set_index(id_col)
        for idx, row in current_df.iterrows():
            key = row.get(id_col)
            if key and key in history_lookup.index:
                hist_row = history_lookup.loc[key]
                for col in old_date_cols:
                    if col in hist_row:
                        current_df.at[idx, col] = hist_row[col]

    # Bring in employees from history who are no longer in the current sheet
    if id_col in history_df.columns and id_col in current_df.columns:
        current_ids = set(current_df[id_col].astype(str).tolist())
        missing_rows = history_df[~history_df[id_col].astype(str).isin(current_ids)]

        if not missing_rows.empty:
            # Align columns
            for col in current_df.columns:
                if col not in missing_rows.columns:
                    missing_rows = missing_rows.copy()
                    missing_rows[col] = 0
            missing_rows = missing_rows[current_df.columns]
            current_df = pd.concat([current_df, missing_rows], ignore_index=True)

    # Save the merged result back to history
    save_history(current_df)

    return current_df
