from fastapi import FastAPI,UploadFile, File, Form, HTTPException
from pydantic import BaseModel
import pandas as pd
from sklearn.model_selection import train_test_split
from tabular_inference_prototype.model import run_prediction

app = FastAPI(title="Tabular Inference Prototype")


@app.get("/hello")
def root():
    return {"message":"hello"}

# class PredictRequest(BaseModel):
#     target_column: str


@app.post("/predict")
def predict(file: UploadFile = File(...), target_column: str = Form(...)):
    df = pd.read_csv(file.file)

    if target_column not in df.columns:
        raise HTTPException(
            status_code=400, 
            detail=f"Target column '{target_column}' not found."
        )

    X = df.drop(columns=[target_column])
    y = df[target_column]

    X_train, X_test, y_train, y_test = train_test_split(
        X, 
        y, 
        test_size=0.2, 
        random_state=42
    )

    prediction = run_prediction(X_train, y_train, X_test)


    return {
        # "filename": file.filename,
        # "target_column": target_column,
        # "feature_rows": X.shape[0],
        # "feature_columns": X.shape[1],
        # "target_rows": len(y)
        # "train_rows": len(X_train),
        # "test_rows": len(X_test),
        "prediction": prediction[:10].tolist()
    }