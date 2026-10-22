"""Small, transparent table checks performed before TabICL's preprocessing.

Feature decisions are made from context rows only. TabICL remains responsible
for encoding, imputation, scaling, and all learned feature transformations.
"""

from datetime import date, datetime
from decimal import Decimal
import math
import re

import numpy as np
import pandas as pd
from pandas.api.types import (
    is_bool_dtype,
    is_complex_dtype,
    is_datetime64_any_dtype,
    is_numeric_dtype,
)


DEFAULT_SIZE_WARNING_THRESHOLDS = {
    "small_rows": 300,
    "large_rows": 10_000,
    "wide_columns": 500,
    "minority_class_rows": 5,
}
_CURRENCY = "$€£¥₹"
_NUMBER = re.compile(
    r"^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$"
)
_ISO_DATE = re.compile(r"^\d{4}[-/]\d{2}[-/]\d{2}(?:[ T].*)?$")
_IDENTIFIER_VALUE = re.compile(
    r"(?:[^@\s]+@[^@\s]+\.[^@\s]+"  # Email addresses.
    r"|\+\d[\d ().-]{6,}|\(\d{2,4}\)[\d .-]{5,}|\d{3}[-.]\d{3}[-.]\d{4}"
    r"|0\d+|[A-Fa-f0-9]{24,}"  # Leading-zero codes and long hashes.
    r"|(?=[A-Za-z0-9_-]*[A-Za-z])(?=[A-Za-z0-9_-]*\d)"
    r"[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*)"
)


def _normalized_column_name(name):
    # Recognize customerID, CustomerId, and account_number alike.
    name = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", str(name))
    name = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name)
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def _identifier_name(name):
    tokens = name.split("_")
    if set(tokens) & {"id", "uuid", "guid", "identifier"}:
        return True
    if tokens[-1] in {"name", "surname", "username", "email", "phone", "telephone", "ssn", "sin", "iban"}:
        return True
    if name.replace("_", "") in {
        "firstname", "lastname", "fullname", "givenname", "familyname",
        "emailaddress", "phonenumber", "telephonenumber", "mobilenumber",
        "socialsecuritynumber", "socialinsurancenumber", "taxnumber",
        "passport", "passportnumber", "postalcode", "postcode", "zipcode",
        "dateofbirth", "dob", "address", "mobile", "index", "rowindex",
    }:
        return True
    return bool(re.search(
        r"(?:^|_)(?:(?:account|acct|customer|client|member|user|record|policy|loan|"
        r"transaction|employee|card)_?(?:id|number|no|num|ref|reference)"
        r"|(?:email|street|mailing|postal|home|residential)_address)$",
        name,
    ))


def _check_columns(df):
    duplicates = df.columns[df.columns.duplicated()].tolist()
    if duplicates:
        raise ValueError(
            "Duplicate column names are not supported: "
            + ", ".join(map(str, duplicates))
            + ". Rename them before uploading."
        )
    if any(not isinstance(column, str) for column in df.columns):
        raise ValueError("All column names must be strings.")


def _thresholds(config):
    if config is not None and not isinstance(config, dict):
        raise ValueError("Preprocessing config must be an object.")
    limits = dict(DEFAULT_SIZE_WARNING_THRESHOLDS)
    overrides = (config or {}).get("size_warning_thresholds", {})
    if not isinstance(overrides, dict):
        raise ValueError("size_warning_thresholds must be an object.")
    for key, value in overrides.items():
        if key not in limits or isinstance(value, bool) or not isinstance(value, int) or value < 1:
            raise ValueError(f"Invalid size warning threshold: {key}.")
        limits[key] = value
    return limits


def _size_warnings(rows, columns, config=None):
    limits = _thresholds(config)
    warnings = []
    if rows < limits["small_rows"]:
        warnings.append(
            f"Only {rows} rows are available; results may be less reliable "
            f"below {limits['small_rows']} rows."
        )
    if rows > limits["large_rows"]:
        warnings.append(
            f"{rows} rows exceed the prototype warning threshold of "
            f"{limits['large_rows']}; memory use and inference latency may be high."
        )
    if columns > limits["wide_columns"]:
        warnings.append(
            f"{columns} columns exceed the prototype warning threshold of "
            f"{limits['wide_columns']}; memory use and inference latency may be high."
        )
    # Training range documented at https://github.com/soda-inria/tabicl.
    # These are guidance, never model capability limits.
    if rows > 48_000:
        warnings.append(
            "The context exceeds TabICLv2's documented training range of 48,000 rows; "
            "performance outside that range may be less predictable."
        )
    if columns > 100:
        warnings.append(
            "The table exceeds TabICLv2's documented training range of 100 features; "
            "performance outside that range may be less predictable."
        )
    return warnings


def _numeric_values(series, *, explicit=False):
    """Parse a whole column safely; percentages use fractions (12.5% -> .125).

    Mixed percentage/plain units, mixed currencies, malformed grouping, and
    ambiguous leading zero codes are never silently interpreted.
    """
    values = []
    percent_flags = set()
    currencies = set()
    for value in series:
        if pd.isna(value):
            values.append(np.nan)
            continue
        if isinstance(value, (bool, np.bool_)):
            raise ValueError("boolean values require categorical handling")
        if isinstance(value, (int, float, np.integer, np.floating)):
            number = float(value)
            percent_flags.add(False)
        elif isinstance(value, str):
            token = value.strip()
            is_percent = token.endswith("%")
            percent_flags.add(is_percent)
            if is_percent:
                token = token[:-1].strip()
            symbols = [char for char in token if char in _CURRENCY]
            if symbols:
                if len(symbols) != 1 or is_percent:
                    raise ValueError("currency/percentage formatting is ambiguous")
                currencies.add(symbols[0])
                # Accept $-10, -$10 and $10, but never a currency suffix.
                if token[0] in _CURRENCY:
                    token = token[1:].strip()
                elif len(token) > 1 and token[0] in "+-" and token[1] in _CURRENCY:
                    token = token[0] + token[2:].strip()
                else:
                    raise ValueError("currency formatting is ambiguous")
            if not _NUMBER.fullmatch(token):
                raise ValueError("some values are not unambiguous numbers")
            if not explicit and re.match(r"^[+-]?0\d", token):
                raise ValueError("leading zero values may be identifiers")
            exact_number = Decimal(token.replace(",", ""))
            if is_percent:
                exact_number /= 100
            if abs(exact_number) > 2**53:
                raise ValueError("numeric strings are too large for safe float conversion")
            number = float(exact_number)
        else:
            raise ValueError("values are not numeric scalars")
        if not math.isfinite(number):
            raise ValueError("numeric values must be finite or missing")
        values.append(number)
    if len(percent_flags) > 1:
        raise ValueError("percentage values and plain numbers use ambiguous mixed units")
    if len(currencies) > 1:
        raise ValueError("multiple currency symbols require explicit currency conversion")
    return pd.Series(values, index=series.index, name=series.name, dtype=float)


def _date_values(series):
    values = []
    for value in series:
        if pd.isna(value):
            values.append(None)
            continue
        if isinstance(value, str):
            if not _ISO_DATE.fullmatch(value.strip()):
                raise ValueError("use unambiguous dates such as YYYY-MM-DD")
        elif not isinstance(value, (date, datetime, pd.Timestamp, np.datetime64)):
            raise ValueError("values are not dates")
        try:
            values.append(pd.Timestamp(value))
        except (TypeError, ValueError, OverflowError) as error:
            raise ValueError("some date values could not be parsed") from error
    return values


def _numeric_format(series):
    nonmissing = series.dropna()
    if not len(nonmissing):
        return None
    percentages = any(isinstance(value, str) and value.strip().endswith("%") for value in nonmissing)
    currencies = {
        character
        for value in nonmissing
        if isinstance(value, str)
        for character in value
        if character in _CURRENCY
    }
    return percentages, currencies


def _column_info(series, name):
    nonmissing = series.dropna()
    warnings = []
    suggestions = []
    dtype = str(series.dtype)
    detected = "categorical"
    numeric_strings = False
    if nonmissing.empty:
        suggestions.append("No observed context values; choose a type explicitly if needed.")
    elif is_complex_dtype(series.dtype):
        warnings.append(f"Column '{name}' contains unsupported complex numbers.")
    elif is_datetime64_any_dtype(series.dtype):
        detected = "date"
    elif is_numeric_dtype(series.dtype) and not is_bool_dtype(series.dtype):
        detected = "numeric"
    elif len(nonmissing):
        try:
            _numeric_values(series)
            detected = "numeric"
            numeric_strings = True
        except (TypeError, ValueError):
            try:
                _date_values(series)
                detected = "date"
            except (TypeError, ValueError):
                pass
    normalized_name = _normalized_column_name(name)
    if _identifier_name(normalized_name):
        warnings.append(
            f"Column '{name}' may contain identifiers or personal information; "
            "review whether to exclude it."
        )
    try:
        unique = int(nonmissing.nunique())
    except TypeError:
        unique = 0
        warnings.append(f"Column '{name}' contains non-scalar values; exclude or clean it.")
    if len(nonmissing) and detected == "categorical":
        text_values = nonmissing.map(str).str.strip()
        unique_ratio = unique / len(nonmissing)
        identifier_ratio = text_values.map(lambda value: bool(_IDENTIFIER_VALUE.fullmatch(value))).mean()
        if len(nonmissing) >= 5 and unique_ratio >= 0.95 and identifier_ratio >= 0.8:
            warnings.append(
                f"Column '{name}' has nearly unique, identifier-like values; "
                "review whether to exclude it."
            )
        elif unique >= 20 and unique_ratio >= 0.5:
            warnings.append(
                f"Column '{name}' has many distinct categories (high cardinality); "
                "review whether it contains identifiers or free text."
            )
        if text_values.str.len().mean() > 40 or text_values.str.split().map(len).mean() > 6:
            warnings.append(f"Column '{name}' may contain free text; review whether to exclude it.")
        if any(re.match(r"^0\d+$", value.strip()) for value in text_values):
            suggestions.append("Leading zero codes are preserved as categories.")
        if "date" in normalized_name or "time" in normalized_name:
            suggestions.append("Date-like name: use ISO dates and a date override, or exclude this column.")
    if detected == "numeric" and len(nonmissing):
        try:
            _numeric_values(series)
        except (TypeError, ValueError):
            warnings.append(f"Column '{name}' contains unsupported numeric values; review non-finite values.")
    if re.search(
        r"(^|[_\s-])(outcome|target|label|prediction|predicted|post|future|result)([_\s-]|$)",
        normalized_name,
    ):
        warnings.append(
            f"Column '{name}' may contain outcome information; review for target leakage. "
            "Name checks cannot detect all leakage."
        )
    if detected == "date":
        suggestions.append("Convert to year, month, and weekday, or exclude this column.")
    elif numeric_strings:
        suggestions.append("Unambiguous numeric strings can be converted; percentages use fractions.")
    return {
        "name": str(name),
        "dtype": dtype,
        "detected_type": detected,
        "missing_values": int(series.isna().sum()),
        "unique_values": unique,
        "warnings": warnings,
        "suggestions": suggestions,
    }


def inspect_dataset(df, config=None):
    """Return JSON-safe upload metadata; inspection never modifies the table."""
    details = [
        _column_info(df.iloc[:, index], column)
        for index, column in enumerate(df.columns)
    ]
    duplicates = [str(name) for name in df.columns[df.columns.duplicated()]]
    warnings = _size_warnings(len(df), len(df.columns), config)
    if duplicates:
        warnings.append("Duplicate column names must be renamed: " + ", ".join(duplicates) + ".")
    warnings.extend(warning for detail in details for warning in detail["warnings"])
    return {
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "column_names": [str(column) for column in df.columns],
        "column_count": int(len(df.columns)),
        "column_details": details,
        "duplicate_columns": duplicates,
        "numerical_columns": [detail["name"] for detail in details if detail["detected_type"] == "numeric"],
        "categorical_columns": [detail["name"] for detail in details if detail["detected_type"] == "categorical"],
        "date_columns": [detail["name"] for detail in details if detail["detected_type"] == "date"],
        "missing_values": {detail["name"]: detail["missing_values"] for detail in details},
        "warnings": list(dict.fromkeys(warnings)),
    }


def suggest_feature_types(df):
    _check_columns(df)
    return {name: _column_info(df[name], name) for name in df.columns}


def validate_target(df, target_column, task_type="classification", mode="prediction", config=None):
    """Validate the selected workflow without dropping or changing any rows."""
    _check_columns(df)
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' does not exist.")
    if task_type not in {"classification", "regression"}:
        raise ValueError("task_type must be 'classification' or 'regression'.")
    if mode not in {"prediction", "evaluation"}:
        raise ValueError("mode must be 'prediction' or 'evaluation'.")
    if len(df.columns) < 2:
        raise ValueError("At least one input feature is required in addition to the target.")
    target = df[target_column]
    labeled = target.dropna()
    missing = int(target.isna().sum())
    if mode == "prediction":
        if len(labeled) < 2:
            raise ValueError("Prediction requires at least two labeled context rows.")
        if not missing:
            raise ValueError(
                "Prediction requires at least one row with a missing target value. "
                "Use Evaluation mode for a fully labeled dataset."
            )
    else:
        if missing:
            raise ValueError(
                f"Evaluation requires a fully labeled dataset; {missing} rows have missing "
                "target values. Use Prediction mode to predict those rows."
            )
        if len(labeled) < 3:
            raise ValueError("Evaluation requires at least three labeled rows for a train/test split.")
    warnings = _size_warnings(len(labeled), len(df.columns) - 1, config)
    summary = {
        "target_column": target_column,
        "task_type": task_type,
        "mode": mode,
        "labeled_rows": int(len(labeled)),
        "query_rows": missing if mode == "prediction" else 0,
        "missing_target_rows": missing,
        "missing_target_rows_excluded": 0,
        "warnings": warnings,
    }
    if task_type == "regression":
        if (
            is_datetime64_any_dtype(labeled.dtype)
            or is_complex_dtype(labeled.dtype)
            or any(isinstance(value, (bool, np.bool_, complex, date, datetime)) for value in labeled)
        ):
            raise ValueError("Regression target values must be finite numbers, not dates, booleans, or complex values.")
        try:
            numeric = pd.to_numeric(labeled, errors="raise").to_numpy(dtype=float)
            if not np.isfinite(numeric).all() or is_bool_dtype(labeled.dtype):
                raise ValueError("non-finite or boolean values")
        except (TypeError, ValueError) as error:
            raise ValueError("Regression target values must be finite numbers.") from error
        if labeled.nunique() == 1:
            warnings.append("All labeled regression targets are identical; predictions may be unreliable.")
        return summary
    if is_datetime64_any_dtype(labeled.dtype) or is_complex_dtype(labeled.dtype):
        raise ValueError("Classification requires discrete class labels, not dates or complex values.")
    labels_are_numeric = all(
        isinstance(value, (int, float, np.integer, np.floating, bool, np.bool_))
        for value in labeled
    )
    labels_are_strings = all(isinstance(value, str) for value in labeled)
    if not labels_are_numeric and not labels_are_strings:
        raise ValueError("Classification target labels must consistently be strings or discrete numbers.")
    if labels_are_numeric:
        numeric = labeled.to_numpy(dtype=float)
        if not np.isfinite(numeric).all():
            raise ValueError("Classification target labels must be finite.")
        if not (numeric % 1 == 0).all():
            raise ValueError("Classification requires discrete labels; choose regression for continuous targets.")
    counts = labeled.value_counts()
    if len(counts) < 2:
        raise ValueError("Classification requires at least two distinct labeled classes.")
    if int(counts.min()) < _thresholds(config)["minority_class_rows"]:
        warnings.append("Some classes have very few labeled examples; predictions and evaluation may be unreliable.")
    summary["class_count"] = int(len(counts))
    summary["class_counts"] = [
        {"label": label.item() if isinstance(label, np.generic) else label, "count": int(count)}
        for label, count in counts.items()
    ]
    return summary


def prepare_features(X_context, config=None, X_query=None):
    """Apply context-selected conversions to both tables, preserving indices.

    Config supports ``excluded_columns``, ``feature_types`` (numeric,
    categorical, date), and optional ``size_warning_thresholds``. No value is
    filled, no row is dropped, and query values never determine feature types.
    """
    config = {} if config is None else config
    if not isinstance(config, dict):
        raise ValueError("Preprocessing config must be an object.")
    _check_columns(X_context)
    if X_query is not None:
        _check_columns(X_query)
        if set(X_query.columns) != set(X_context.columns):
            raise ValueError("Context and query tables must contain the same feature columns.")
    excluded = config.get("excluded_columns", [])
    overrides = config.get("feature_types", {})
    if not isinstance(excluded, list) or any(not isinstance(name, str) for name in excluded):
        raise ValueError("excluded_columns must be a list of column names.")
    if not isinstance(overrides, dict):
        raise ValueError("feature_types must map column names to numeric, categorical, or date.")
    unknown = (set(excluded) | set(overrides)) - set(X_context.columns)
    if unknown:
        raise ValueError("Unknown feature columns: " + ", ".join(sorted(map(str, unknown))) + ".")
    if any(not isinstance(value, str) or value not in {"numeric", "categorical", "date"} for value in overrides.values()):
        raise ValueError("Feature type overrides must be numeric, categorical, or date.")
    columns = [column for column in X_context.columns if column not in excluded]
    if not columns:
        raise ValueError("At least one input feature must remain after excluding columns.")
    info = suggest_feature_types(X_context[columns])
    selected_types = {name: overrides.get(name, info[name]["detected_type"]) for name in columns}
    warnings = _size_warnings(len(X_context), len(columns), config)
    warnings.extend(warning for name in columns for warning in info[name]["warnings"])
    converted = []
    reserved = set(columns)
    date_outputs = {}
    numeric_formats = {
        name: _numeric_format(X_context[name])
        for name in columns
        if selected_types[name] == "numeric"
    }
    for name in columns:
        if selected_types[name] == "date":
            output_names = [f"{name}__year", f"{name}__month", f"{name}__weekday"]
            if any(output_name in reserved for output_name in output_names):
                raise ValueError(f"Date features for '{name}' collide with existing column names.")
            reserved.update(output_names)
            date_outputs[name] = output_names
        if selected_types[name] == "date" or selected_types[name] != info[name]["detected_type"] or (
            selected_types[name] == "numeric" and not is_numeric_dtype(X_context[name].dtype)
        ):
            converted.append({
                "column": name,
                "from_type": str(X_context[name].dtype),
                "to_type": selected_types[name],
                "output_columns": date_outputs.get(name, [name]),
            })

    def convert(frame, role):
        result = pd.DataFrame(index=frame.index)
        for name in columns:
            series = frame[name]
            feature_type = selected_types[name]
            try:
                if feature_type == "numeric":
                    if role == "query" and numeric_formats[name] is not None:
                        query_format = _numeric_format(series)
                        context_percent, context_currencies = numeric_formats[name]
                        if query_format is not None:
                            query_percent, query_currencies = query_format
                            if query_percent != context_percent:
                                raise ValueError("percentage formatting must match the context column")
                            if query_currencies and query_currencies != context_currencies:
                                raise ValueError("currency symbols must match the context column")
                    if is_numeric_dtype(series.dtype) and not is_bool_dtype(series.dtype):
                        if is_complex_dtype(series.dtype):
                            raise ValueError("complex values are unsupported")
                        if not np.isfinite(series.dropna().to_numpy(dtype=float)).all():
                            raise ValueError("numeric values must be finite or missing")
                        result[name] = series
                    else:
                        result[name] = _numeric_values(series, explicit=name in overrides)
                elif feature_type == "date":
                    parsed = _date_values(series)
                    for output, attribute in zip(date_outputs[name], ("year", "month", "dayofweek")):
                        result[output] = [
                            np.nan if value is None else getattr(value, attribute)
                            for value in parsed
                        ]
                else:
                    if any(isinstance(value, (list, dict, set, tuple, complex)) for value in series.dropna()):
                        raise ValueError("categorical values must be scalar strings, numbers, or booleans")
                    # TabICL's encoder needs homogeneous scalar types and np.nan,
                    # including when pandas nullable dtypes use pd.NA.
                    result[name] = pd.Series(
                        [np.nan if pd.isna(value) else str(value) for value in series],
                        index=series.index,
                        dtype=object,
                    )
            except (TypeError, ValueError, OverflowError) as error:
                raise ValueError(
                    f"Cannot prepare {role} column '{name}' as {feature_type}: {error}. "
                    "Clean the values, choose a suitable feature type, or exclude the column."
                ) from error
        return result

    context = convert(X_context, "context")
    query = convert(X_query, "query") if X_query is not None else None
    summary = {
        "original_shape": {"rows": int(len(X_context)), "columns": int(len(X_context.columns))},
        "final_shape": {"rows": int(len(context)), "columns": int(len(context.columns))},
        "query_shape": None if query is None else {"rows": int(len(query)), "columns": int(len(query.columns))},
        "columns_excluded": list(dict.fromkeys(excluded)),
        "columns_converted": converted,
        "detected_feature_types": {name: info[name]["detected_type"] for name in columns},
        "applied_feature_types": selected_types,
        "missing_values_preserved": True,
        "warnings": list(dict.fromkeys(warnings)),
    }
    return context, query, summary
