import pandas as pd


def validate_columns(df):

    print("\n--- Column Validation Report ---")

    # -----------------------------
    # REMOVE COMPLETELY EMPTY COLUMNS
    # -----------------------------
    before_cols = len(df.columns)

    df = df.dropna(axis=1, how="all")

    df = df.loc[:, (df != "").any()]

    after_cols = len(df.columns)

    print(f"Empty columns removed: {before_cols - after_cols}")

    # -----------------------------
    # CHECK IMPORTANT COLUMNS
    # -----------------------------
    required_columns = [
        "Email ID",
        "Name",
        "TL",
        "Employee status"
    ]

    missing = []

    for col in required_columns:
        if col not in df.columns:
            missing.append(col)

    if missing:
        print("Warning: Missing important columns →", missing)
    else:
        print("All important columns present")

    # -----------------------------
    # DETECT DATE COLUMNS
    # -----------------------------
    date_columns = [col for col in df.columns if "-" in str(col)]

    print(f"Detected meeting date columns: {len(date_columns)}")

    # -----------------------------
    # TOTAL COLUMN COUNT
    # -----------------------------
    print(f"Total columns in dataset: {len(df.columns)}")

    return df