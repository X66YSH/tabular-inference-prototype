# preprocessing.py
import pandas as pd
from sklearn.model_selection import train_test_split

def preprocess(df: pd.DataFrame, target_column: str, task_type: str, mode: str, excluded_columns: list[str]):
    """
    Preprocesses the input DataFrame for inference or inspection.

    Args:
        df (pd.DataFrame): The input DataFrame.
        target_column (str): The name of the target column.
        task_type (str): The type of task (e.g., "classification", "regression").
        mode (str): The mode of operation (e.g., "inference", "inspection").
        excluded_columns (list[str]): List of columns to exclude from processing.
    Returns:
        pd.DataFrame: The preprocessed DataFrame.
        list[int]: The indices of the query samples.
    """
    
    X = df.drop(columns=excluded_columns + [target_column])
    y = df[target_column]

    if mode == "prediction":
            labeled = y.notna()
            unlabeled = y.isna()

            X_context = X[labeled]
            y_context = y[labeled]
            X_query = X[unlabeled]
            y_query = None  # No labels for query samples in prediction mode

    elif mode == "evaluation":
            labeled = y.notna()

            X_context, X_query, y_context, y_query = train_test_split(
                X[labeled], y[labeled], test_size=0.2, random_state=42
            )

    query_indices = X_query.index.tolist()

    return X_context, y_context, X_query, y_query, query_indices
    