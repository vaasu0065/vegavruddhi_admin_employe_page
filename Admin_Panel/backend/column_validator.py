def validate_columns(df):

    required_columns = [
        "Name",
        "TL",
        "Employee status",
        "Employment type"
    ]

    for col in required_columns:

        if col not in df.columns:

            print(f"Warning: Missing column → {col}")

            df[col] = "Unknown"

    return df