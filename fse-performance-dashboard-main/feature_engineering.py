import pandas as pd
import re


def feature_engineering(df, numeric_cols, date_cols):
    daily_trend = []
    monthly_meetings = {}
    tl_performance = {}
    total_meetings = 0.0
    product_columns = []
    product_totals = {}
    product_groups = {}

    # Defragment upfront — combined sheet has many columns
    df = df.copy()

    # -----------------------------
    # DETECT MEETING DATE COLUMNS
    # -----------------------------

    meeting_columns = [c for c in date_cols if c in df.columns]

    # -----------------------------
    # PROCESS MEETING COLUMNS
    # -----------------------------

    if meeting_columns:

        print("Detected Meeting Columns:", meeting_columns)

        df[meeting_columns] = df[meeting_columns].apply(
            pd.to_numeric, errors="coerce"
        ).fillna(0)

        df["Total_Meetings_Calc"] = df[meeting_columns].sum(axis=1)

    # -----------------------------
    # NORMALIZE MEETING DATA (vectorized — no iterrows)
    # -----------------------------

    meeting_df = pd.DataFrame()

    if meeting_columns:
        # Melt date columns into long format — much faster than iterrows
        id_vars = [c for c in ["Name", "TL"] if c in df.columns]
        melted = df[id_vars + meeting_columns].melt(
            id_vars=id_vars, var_name="col", value_name="Meetings"
        )
        melted["Date"] = pd.to_datetime(melted["col"], errors="coerce")
        melted = melted[melted["Date"].notna() & (melted["Meetings"] > 0)].copy()
        melted["Month"] = melted["Date"].dt.strftime("%B")
        meeting_df = melted.rename(columns={"col": "_date_col"})

    # -----------------------------
    # AGGREGATIONS
    # -----------------------------

    if not meeting_df.empty:

        total_meetings = float(meeting_df["Meetings"].sum())
        monthly_meetings = meeting_df.groupby("Month")["Meetings"].sum().to_dict()

        daily_trend = (
            meeting_df.groupby("Date")["Meetings"].sum()
            .reset_index()
            .assign(Date=lambda x: x["Date"].astype(str))
            .to_dict(orient="records")
        )

        tl_col = "TL" if "TL" in meeting_df.columns else None
        if tl_col:
            tl_performance = meeting_df.groupby(tl_col)["Meetings"].sum().to_dict()
    # -----------------------------
    # SMART PRODUCT DETECTION (AUTO)
    # -----------------------------

    excluded_numeric = set(
        [
            *date_cols,
            "Total",
            "Total_Meetings_Calc",
            "Total_Points",
            "Activity_Score",
            "Meetings_per_Active_Day",
            "Total_Product_Sales",
            "Total active days",
            "_source",          # sheet source tag added by connect_sheet.py
            "_month",           # month label tag added by connect_sheet.py
        ]
    )

    # treat "product columns" as numeric columns excluding date columns + computed totals
    # this automatically adapts if new product columns are added/renamed in the sheet
    product_columns = [
        c
        for c in numeric_cols
        if (c in df.columns)
        and (c not in excluded_numeric)
        and (not str(c).endswith("_Sales"))
    ]

    # ensure numeric
    if product_columns:
        df[product_columns] = df[product_columns].apply(pd.to_numeric, errors="coerce").fillna(0)

    for col in product_columns:
        product_totals[col] = float(df[col].sum())

    def infer_group(col_name: str) -> str:
        col_lower = str(col_name).lower()
        if "tide" in col_lower:
            return "Tide"
        if "vehicle" in col_lower:
            return "Vehicle"
        if "birla" in col_lower:
            return "Birla"
        if "airtel" in col_lower:
            return "Airtel"
        if "hero" in col_lower:
            return "Hero"
        return "Other"

    for col in product_columns:
        group = infer_group(col)
        if group not in product_groups:
            product_groups[group] = {"columns": [], "total": 0.0}
        product_groups[group]["columns"].append(col)
        product_groups[group]["total"] += product_totals.get(col, 0.0)

    # -----------------------------
    # CALCULATE PRODUCT TOTALS
    # -----------------------------

    product_total_columns = []
    new_cols_dict = {}

    detected_products = {
        group: meta["columns"] for group, meta in product_groups.items() if group != "Other"
    }

    for product, cols in detected_products.items():
        if cols:
            df[cols] = df[cols].apply(pd.to_numeric, errors="coerce").fillna(0)
            new_col = f"{product}_Sales"
            new_cols_dict[new_col] = df[cols].sum(axis=1)
            product_total_columns.append(new_col)

    # -----------------------------
    # FINAL PRODUCT SALES
    # -----------------------------

    if product_total_columns:
        new_cols_dict["Total_Product_Sales"] = pd.DataFrame(new_cols_dict).sum(axis=1)

    # Add all new columns at once to avoid fragmentation
    if new_cols_dict:
        df = pd.concat([df, pd.DataFrame(new_cols_dict, index=df.index)], axis=1)

    # -----------------------------
    # TOTAL POINTS CALCULATION
    # -----------------------------

    points_formula = {
        "Tide OB with PP": 2,
        "Tide Insurance": 1,
        "Tide MSME": 0.3,
        "Vehicle Points Earned": 1,
        "Aditya Birla": 1,
        "Airtel Payments Bank": 1,
        "Tide": 1,
        "Hero FinCorp": 1
    }

    total_points = pd.Series(0.0, index=df.index)
    for col, weight in points_formula.items():
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
            total_points += df[col] * weight

    extra_cols = {"Total_Points": total_points}

    if "Total active days" in df.columns:
        df["Total active days"] = pd.to_numeric(df["Total active days"], errors="coerce").fillna(0)
        extra_cols["Activity_Score"] = df["Total active days"]

    if "Total active days" in df.columns and "Total_Meetings_Calc" in df.columns:
        extra_cols["Meetings_per_Active_Day"] = df.apply(
            lambda x: x["Total_Meetings_Calc"] / x["Total active days"]
            if x["Total active days"] > 0 else 0,
            axis=1
        )

    df = pd.concat([df, pd.DataFrame(extra_cols, index=df.index)], axis=1)

    return (
        df,
        daily_trend,
        monthly_meetings,
        tl_performance,
        total_meetings,
        product_columns,
        product_totals,
        product_groups
    )


def filter_by_month(meeting_df: pd.DataFrame, selected_month: str) -> pd.DataFrame:
    return meeting_df[meeting_df["Month"] == selected_month]