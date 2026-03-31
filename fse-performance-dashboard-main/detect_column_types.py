import pandas as pd


def detect_column_types(df):

    numeric_columns = []
    text_columns = []

    for col in df.columns:

        # remove blanks
        series = df[col].replace("", pd.NA).dropna()

        if len(series) == 0:
            text_columns.append(col)
            continue

        # attempt numeric conversion
        numeric_series = pd.to_numeric(series, errors="coerce")

        numeric_count = numeric_series.notna().sum()

        ratio = numeric_count / len(series)

        # classify column
        if ratio > 0.8:
            numeric_columns.append(col)
        else:
            text_columns.append(col)

    return numeric_columns, text_columns