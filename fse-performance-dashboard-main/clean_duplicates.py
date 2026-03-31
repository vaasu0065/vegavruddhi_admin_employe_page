import pandas as pd


def clean_duplicate_columns(df):

    # -----------------------------
    # REMOVE COMPLETELY EMPTY COLUMNS
    # -----------------------------
    df = df.dropna(axis=1, how="all")

    df = df.loc[:, (df != "").any()]

    # -----------------------------
    # FIX DUPLICATE COLUMN NAMES
    # -----------------------------
    new_cols = []
    count = {}

    for col in df.columns:

        col = str(col).strip()

        if col in count:
            count[col] += 1
            new_cols.append(f"{col}_{count[col]}")
        else:
            count[col] = 0
            new_cols.append(col)

    df.columns = new_cols

    return df