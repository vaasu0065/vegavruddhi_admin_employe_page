import pandas as pd
import re


def smart_detect_columns(df):

    numeric_cols = []
    text_cols = []
    date_cols = []

    date_pattern = r"\d{2}-\d{2}-\d{4}"

    for col in df.columns:

        col_name = str(col).strip()

        # -------------------------
        # detect date columns
        # -------------------------

        if re.match(date_pattern, col_name):
            date_cols.append(col_name)
            numeric_cols.append(col_name)
            continue

        # -------------------------
        # detect numeric by data
        # -------------------------

        series = df[col].replace("", pd.NA).dropna()

        if len(series) == 0:
            text_cols.append(col_name)
            continue

        numeric_test = pd.to_numeric(series, errors="coerce")

        ratio = numeric_test.notna().sum() / len(series)

        if ratio > 0.7:
            numeric_cols.append(col_name)
        else:
            text_cols.append(col_name)

    return numeric_cols, text_cols, date_cols