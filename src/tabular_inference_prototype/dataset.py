# dataset.py
import pandas as pd
from fastapi import UploadFile

def read_dataset(file: UploadFile) -> pd.DataFrame:
    """
    Reads a CSV dataset from an uploaded file.
    
    Args:
        file (UploadFile): The uploaded CSV file.
    """

    if not file.filename.endswith('.csv'):
        raise ValueError("Only CSV files are supported.")

    return pd.read_csv(file.file)

