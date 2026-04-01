from connect_sheet import load_sheet
from column_validation import validate_columns
from clean_duplicates import clean_duplicate_columns
from smart_column_detection import smart_detect_columns
from handle_missing_values import handle_missing_values
from convert_data_types import convert_data_types
from feature_engineering import feature_engineering


# load sheet
df = load_sheet()
df = df.dropna(axis=1, how="all")
# validate columns
df = validate_columns(df)

# clean duplicates
df = clean_duplicate_columns(df)

# detect column types
numeric_cols, text_cols, date_cols = smart_detect_columns(df)

# handle missing values
df = handle_missing_values(df, numeric_cols, text_cols)

# convert data types
df = convert_data_types(df, numeric_cols, date_cols)

# feature engineering
df, *_ = feature_engineering(df, numeric_cols, date_cols)

print("\nFinal Data Preview:")
print(df.head())