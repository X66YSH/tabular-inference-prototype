import csv
from datetime import date, datetime, time
from decimal import Decimal
from io import TextIOWrapper
import json
import math
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from tabular_inference_prototype.model import run_prediction
from tabular_inference_prototype.preprocessing import inspect_dataset, prepare_features, validate_target

app = FastAPI(title="Tabular Inference Prototype")


@app.get("/hello")
def root():
    return {"message": "hello"}


def _normalize_numeric_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Keep the existing inference/inspection numeric normalization in one place."""
    for index in range(len(df.columns)):
        column = df.iloc[:, index]
        values = column.dropna()
        if values.empty or values.astype(str).str.match(r"^[+-]?0\d").any():
            continue
        try:
            numeric = pd.to_numeric(column)
        except (TypeError, ValueError):
            continue
        if any(isinstance(value, str) and abs(Decimal(value)) > 2**53 for value in values):
            continue
        if (numeric.dropna().abs() <= 2**53).all():
            df.isetitem(index, numeric)
    return df


def read_dataset(file: UploadFile, *, preserve_values: bool = False) -> pd.DataFrame:
    """Use common parsing/missingness rules; previews skip numeric normalization."""
    extension = Path(file.filename or "").suffix.lower()
    if extension not in {".csv", ".xlsx"}:
        raise HTTPException(400, "Only CSV and XLSX files are supported.")
    try:
        file.file.seek(0)
        if extension == ".csv":
            text_file = TextIOWrapper(file.file, encoding="utf-8-sig", newline="")
            try:
                reader = csv.reader(text_file, strict=True)
                names = next(reader)
                if any(len(row) > len(names) for row in reader):
                    raise ValueError("Data rows contain more fields than the header.")
            finally:
                text_file.detach()
            file.file.seek(0)
            # Preserve leading-zero codes until users choose feature types.
            df = pd.read_csv(file.file, skip_blank_lines=False, dtype=object)
        else:
            header = pd.read_excel(file.file, header=None, nrows=1, keep_default_na=False, dtype=object)
            names = [str(name) for name in header.iloc[0]]
            file.file.seek(0)
            df = pd.read_excel(file.file, dtype=object)
        if len(names) != len(df.columns) or any(not name.strip() for name in names):
            raise ValueError("Every column must have a non-empty header.")
        df.columns = names
        if df.empty:
            raise ValueError("The dataset must contain data rows.")
        return df if preserve_values else _normalize_numeric_columns(df)
    except Exception as exc:
        # Parser errors can contain uploaded cell values; keep those out of responses.
        raise HTTPException(
            400,
            "Could not read the dataset. Use a valid UTF-8 CSV or XLSX with a header "
            "for every column and at least one data row.",
        ) from exc


@app.post("/inspect")
def inspect(file: UploadFile = File(...)):
    raw = read_dataset(file, preserve_values=True)
    # Capture only the first page before normalizing metadata. This preserves
    # raw values without parsing twice or copying the full table for previews.
    initial_preview = make_preview(raw)
    metadata = inspect_dataset(_normalize_numeric_columns(raw))
    metadata["preview"] = initial_preview
    return metadata


def _preview_scalar(value):
    """Serialize a nonmissing cell without losing browser integer precision."""
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, int) and not isinstance(value, bool) and abs(value) > 2**53 - 1:
        return str(value)
    if isinstance(value, float) and not math.isfinite(value):
        return str(value)
    return value


def make_preview(
    df: pd.DataFrame,
    *,
    offset: int = 0,
    limit: int = 50,
    target_column: str | None = None,
    row_filter: str = "all",
    row_indices: str | None = None,
) -> dict:
    """Filter original row positions, then serialize only the requested page."""
    selected = np.ones(len(df), dtype=bool)
    if target_column is not None:
        target_count = sum(name == target_column for name in df.columns)
        if target_count == 0:
            raise HTTPException(400, "The selected target column does not exist in this dataset.")
        if target_count > 1:
            raise HTTPException(400, "The selected target column has a duplicate name. Rename duplicate headers first.")
    if row_filter != "all":
        if target_column is None:
            raise HTTPException(400, "Select a target column before filtering missing or labeled rows.")
        missing = df[target_column].isna().to_numpy()
        selected &= missing if row_filter == "missing" else ~missing
    if row_indices is not None:
        try:
            indices = json.loads(row_indices)
        except (TypeError, json.JSONDecodeError) as exc:
            raise HTTPException(400, "row_indices must contain a valid JSON array of original row positions.") from exc
        if not isinstance(indices, list) or any(type(index) is not int for index in indices):
            raise HTTPException(400, "row_indices must be a JSON array of integer row positions.")
        if len(indices) != len(set(indices)) or any(index < 0 or index >= len(df) for index in indices):
            raise HTTPException(400, "row_indices must contain unique row positions within this dataset.")
        included = np.zeros(len(df), dtype=bool)
        included[indices] = True
        selected &= included
    positions = np.flatnonzero(selected)
    page_positions = positions[offset:offset + limit]
    rows = []
    for position, values in zip(page_positions, df.iloc[page_positions].itertuples(index=False, name=None)):
        missing = [bool(pd.isna(value)) for value in values]
        rows.append({
            "row_index": int(position),
            "values": [None if absent else _preview_scalar(value) for value, absent in zip(values, missing)],
            "missing": missing,
        })
    return {
        "columns": df.columns.tolist(),
        "total_rows": len(df),
        "filtered_rows": len(positions),
        "offset": offset,
        "limit": limit,
        "rows": rows,
    }


@app.post("/preview")
def preview(
    file: UploadFile = File(...),
    offset: int = Form(0, ge=0),
    limit: int = Form(50, ge=1, le=100),
    target_column: str | None = Form(None),
    row_filter: Literal["all", "missing", "labeled"] = Form("all"),
    row_indices: str | None = Form(None),
):
    return make_preview(
        read_dataset(file, preserve_values=True),
        offset=offset,
        limit=limit,
        target_column=target_column,
        row_filter=row_filter,
        row_indices=row_indices,
    )


def parse_config(excluded_columns: str, feature_types: str, target_column: str) -> dict:
    try:
        excluded = json.loads(excluded_columns)
        overrides = json.loads(feature_types)
    except (TypeError, json.JSONDecodeError) as exc:
        raise ValueError("excluded_columns and feature_types must contain valid JSON.") from exc
    if not isinstance(excluded, list) or not all(isinstance(name, str) for name in excluded):
        raise ValueError("excluded_columns must be a JSON array of column names.")
    if not isinstance(overrides, dict) or not all(
        isinstance(name, str) and kind in ("numeric", "categorical", "date")
        for name, kind in overrides.items()
    ):
        raise ValueError("feature_types must map column names to numeric, categorical, or date.")
    if target_column in excluded or target_column in overrides:
        raise ValueError("Feature options cannot include the target column.")
    return {"excluded_columns": excluded, "feature_types": overrides}


def split_rows(df: pd.DataFrame, target_column: str, task_type: str, mode: str):
    """Split positions, so outputs stay aligned even when rows are interleaved."""
    positions = np.arange(len(df))
    if mode == "prediction":
        labeled = df[target_column].notna().to_numpy()
        return positions[labeled], positions[~labeled], {"strategy": "target_missingness"}, []

    target = df[target_column]
    stratify = None
    warnings = []
    if task_type == "classification":
        counts = target.value_counts()
        test_rows = math.ceil(len(df) * 0.2)
        if counts.min() >= 2 and min(test_rows, len(df) - test_rows) >= len(counts):
            stratify = target
        else:
            warnings.append(
                "Stratified 80/20 splitting is not feasible for these class counts. "
                "A reproducible unstratified split was used."
            )
    context, query = train_test_split(
        positions, test_size=0.2, random_state=42, stratify=stratify
    )
    if len(context) < 2:
        raise ValueError("Evaluation requires at least two context rows after the 80/20 split.")
    if task_type == "classification" and target.iloc[context].nunique() != target.nunique():
        raise ValueError(
            "The 80/20 split leaves a class without labeled context. Add more examples "
            "of the rare classes before evaluating."
        )
    return (
        context,
        np.sort(query),
        {"strategy": "stratified" if stratify is not None else "random", "test_fraction": 0.2, "random_state": 42},
        warnings,
    )


def unique_column_name(columns, base: str) -> str:
    name = base
    suffix = 2
    while name in columns:
        name = f"{base}_{suffix}"
        suffix += 1
    return name


def make_download(df, target_column, query_positions, predictions, mode, filename):
    completed = df.copy()
    prediction_column = unique_column_name(completed.columns, f"{target_column}_prediction")
    completed[prediction_column] = pd.Series([None] * len(df), index=df.index, dtype=object)
    completed.iloc[query_positions, completed.columns.get_loc(prediction_column)] = predictions
    completed_target_column = None
    if mode == "prediction":
        completed_target_column = unique_column_name(completed.columns, f"{target_column}_completed")
        completed[completed_target_column] = df[target_column].astype(object)
        completed.iloc[query_positions, completed.columns.get_loc(completed_target_column)] = predictions
    return prediction_column, completed_target_column, {
        "filename": f"{Path(filename or 'dataset').stem}_{mode}.csv",
        "content_type": "text/csv",
        "content": completed.to_csv(index=False),
    }


@app.post("/predict")
def predict(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    mode: str = Form("prediction"),
    task_type: str = Form("classification"),
    excluded_columns: str = Form("[]"),
    feature_types: str = Form("{}"),
):
    df = read_dataset(file)
    try:
        config = parse_config(excluded_columns, feature_types, target_column)
        target_summary = validate_target(df, target_column, task_type, mode)
        context_positions, query_positions, split, split_warnings = split_rows(
            df, target_column, task_type, mode
        )
        features = df.drop(columns=[target_column])
        X_context, X_query, preprocessing = prepare_features(
            features.iloc[context_positions], config=config, X_query=features.iloc[query_positions]
        )
        y_context = df[target_column].iloc[context_positions]
        if task_type == "regression":
            y_context = pd.to_numeric(y_context)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    try:
        prediction = np.asarray(run_prediction(X_context, y_context, X_query, task_type=task_type))
    except FileNotFoundError as exc:
        raise HTTPException(503, "The local TabICL checkpoint is missing. Automatic downloads are disabled.") from exc
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            400, "TabICL could not process these features or labels. Review feature types and exclusions."
        ) from exc
    except (RuntimeError, MemoryError) as exc:
        raise HTTPException(
            503, "TabICL inference failed. Check the local checkpoint and available memory, or try a smaller dataset."
        ) from exc
    if prediction.ndim != 1 or len(prediction) != len(query_positions):
        raise HTTPException(500, "TabICL returned an unexpected number or shape of predictions.")
    if pd.isna(prediction).any():
        raise HTTPException(503, "TabICL returned missing predictions. Review the context data and try again.")
    if task_type == "regression":
        try:
            valid_predictions = np.isfinite(prediction.astype(float)).all()
        except (ValueError, TypeError):
            valid_predictions = False
        if not valid_predictions:
            raise HTTPException(503, "TabICL returned non-finite regression predictions. Review the context data.")

    # pandas handles numpy scalar labels without exposing NaN in JSON.
    prediction_values = json.loads(pd.Series(prediction).to_json(orient="values"))
    records = [
        {"row_index": int(position), "prediction": value}
        for position, value in zip(query_positions, prediction_values)
    ]
    metrics = None
    if mode == "evaluation":
        actual = df[target_column].iloc[query_positions]
        if task_type == "classification":
            metrics = {
                "accuracy": float(accuracy_score(actual, prediction)),
                "f1_macro": float(f1_score(actual, prediction, average="macro", zero_division=0)),
            }
        else:
            actual = pd.to_numeric(actual)
            r2 = float(r2_score(actual, prediction)) if len(actual) >= 2 else None
            metrics = {
                "mae": float(mean_absolute_error(actual, prediction)),
                "rmse": float(math.sqrt(mean_squared_error(actual, prediction))),
                "r2": r2 if r2 is not None and math.isfinite(r2) else None,
            }
        actual_values = json.loads(actual.to_json(orient="values"))
        for record, value in zip(records, actual_values):
            record["actual"] = value

    prediction_column, completed_column, download = make_download(
        df, target_column, query_positions, prediction, mode, file.filename
    )
    warnings = list(dict.fromkeys(
        target_summary.get("warnings", []) + preprocessing.get("warnings", []) + split_warnings
    ))
    preprocessing.update({
        "mode": mode,
        "task_type": task_type,
        "original_shape": {"rows": len(df), "columns": len(df.columns)},
        "final_shape": {"rows": len(df), "columns": len(X_context.columns)},
        "context_rows": len(X_context),
        "query_rows": len(X_query),
        "labeled_rows": target_summary["labeled_rows"],
        "unlabeled_rows": int(df[target_column].isna().sum()),
        "missing_target_rows_excluded": 0,
        "split": split,
        "warnings": warnings,
    })
    return {
        "mode": mode,
        "task_type": task_type,
        "prediction": prediction_values,
        "row_indices": query_positions.tolist(),
        "predictions": records,
        "metrics": metrics,
        "preprocessing": preprocessing,
        "prediction_column": prediction_column,
        "completed_target_column": completed_column,
        "download": download,
    }
