import pandas as pd

def handle_missing_values(df, numeric_cols, text_cols):

    # -----------------------------
    # 1 REMOVE FULLY EMPTY COLUMNS
    # -----------------------------

    df = df.dropna(axis=1, how="all")

    # -----------------------------
    # 2 REMOVE COLUMNS WITH EMPTY NAMES
    # -----------------------------

    df = df.loc[:, df.columns.str.strip() != ""]

    # -----------------------------
    # 3 HANDLE NUMERIC COLUMNS
    # -----------------------------

    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # -----------------------------
    # 4 HANDLE TEXT COLUMNS
    # -----------------------------

    for col in text_cols:
        if col in df.columns:
            df[col] = df[col].replace(["", "#N/A", "NA"], pd.NA)
            df[col] = df[col].fillna("Unknown")

    return df