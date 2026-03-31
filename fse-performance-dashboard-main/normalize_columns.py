import pandas as pd


def normalize_columns(df):

    new_columns = []

    for col in df.columns:

        clean_col = str(col).strip()

        clean_col = clean_col.replace("\n", " ")
        clean_col = clean_col.replace("  ", " ")

        new_columns.append(clean_col)

    df.columns = new_columns

    return df