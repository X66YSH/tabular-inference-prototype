from tabular_inference_prototype.dataset import read_dataset
from tabular_inference_prototype.preprocessing import preprocess
from tabular_inference_prototype.model import run_prediction
from fastapi import FastAPI, File, Form, UploadFile

app = FastAPI(title="Tabular Inference Prototype")


@app.get("/hello")
def root():
    return {"message": "hello"}


@app.post("/predict")
def predict(file: UploadFile = File(...), target_column: str = Form(...), task_type: str = Form(...), mode: str = Form(...), excluded_columns: list[str] = Form([])):
    """
    Endpoint to handle predictions.

    Args:
        file (UploadFile): The uploaded CSV file.
        target_column (str): The name of the target column.
        task_type (str): The type of task (e.g., "classification", "regression").
        mode (str): The mode of operation (e.g., "prediction", "evaluation").
        excluded_columns (list[str]): List of columns to exclude from processing.
    Returns:
        dict: A dictionary containing the predictions and the indices of the query samples.
    """
    # Read the dataset from the uploaded file
    df = read_dataset(file)

    # Preprocess the dataset
    X_context, y_context, X_query, y_query, query_indices = preprocess(
        df, target_column, task_type, mode, excluded_columns
    )

    try:
        # Run prediction using the preprocessed data
        predictions = run_prediction(X_context, y_context, X_query, task_type)
    except Exception as e:
        return {"error": str(e)}

    
    records = [
        {"row_index": int(i), "prediction": p}
        for i, p in zip(query_indices, predictions.tolist())
    ]

    return {"predictions": records}

