import pandas as pd


def convert_data_types(df, numeric_cols, date_cols):

    # -----------------------------
    # CONVERT NUMERIC COLUMNS
    # -----------------------------
    for col in numeric_cols:

        try:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        except Exception:
            pass

    # -----------------------------
    # ENSURE TOTAL POINTS IS NUMERIC
    # -----------------------------
    if "Total Points" in df.columns:
        df["Total Points"] = pd.to_numeric(
            df["Total Points"], errors="coerce"
        ).fillna(0)

    if "Total Points_1" in df.columns:
        df["Total Points_1"] = pd.to_numeric(
            df["Total Points_1"], errors="coerce"
        ).fillna(0)

    return df