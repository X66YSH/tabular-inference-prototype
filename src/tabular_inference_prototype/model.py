from pathlib import Path

from tabicl import TabICLClassifier, TabICLRegressor

MODEL_PATH = Path(__file__).parent / "model_weights" / "tabicl-classifier-v2-20260212.ckpt"
REGRESSION_MODEL_PATH = Path(__file__).parent / "model_weights" / "tabicl-regressor-v2-20260212.ckpt"


def run_prediction(X_train, y_train, X_test, task_type="classification"):
    if task_type == "classification":
        estimator, model_path = TabICLClassifier, MODEL_PATH
    elif task_type == "regression":
        estimator, model_path = TabICLRegressor, REGRESSION_MODEL_PATH
    else:
        raise ValueError("task_type must be classification or regression.")
    if not model_path.is_file():
        raise FileNotFoundError(f"Local TabICL checkpoint not found: {model_path.name}")
    model = estimator(
        model_path=model_path,
        allow_auto_download=False
    )
    model.fit(X_train, y_train)

    return model.predict(X_test)
