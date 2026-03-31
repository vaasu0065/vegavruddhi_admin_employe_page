from fastapi import FastAPI
import pandas as pd

from connect_sheet import load_sheet
from column_validation import validate_columns
from clean_duplicates import clean_duplicate_columns
from smart_column_detection import smart_detect_columns
from handle_missing_values import handle_missing_values
from convert_data_types import convert_data_types
from feature_engineering import feature_engineering

app = FastAPI()


def load_clean_data():

    df = load_sheet()

    df = validate_columns(df)

    df = clean_duplicate_columns(df)

    numeric_cols, text_cols, date_cols = smart_detect_columns(df)

    df = handle_missing_values(df, numeric_cols, text_cols)

    df = convert_data_types(df, numeric_cols, date_cols)

    df, *_ = feature_engineering(df, numeric_cols, date_cols)

    return df


@app.get("/dashboard-data")
def get_dashboard_data():

    df = load_clean_data()

    return df.to_dict(orient="records")