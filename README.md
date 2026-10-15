# Tabular Inference Prototype

A lightweight prototype for tabular prediction using TabICL as the backbone model and FastAPI as the backend API.

## Current Workflow

- CSV upload
- target column selection
- basic validation
- pandas DataFrame parsing
- train/test split
- TabICL inference
- JSON prediction output

## Project Structure

```text
tabular-inference-prototype/
├── src/
│   └── tabular_inference_prototype/
│       ├── __init__.py
│       ├── main.py
│       ├── model.py
│       └── preprocessing.py
├── sample_customers.csv
├── pyproject.toml
├── uv.lock
└── README.md
```

## Requirements

- Python 3.11
- uv

Check uv:

```bash
uv --version
```

## Setup

Enter the project directory:

```bash
cd tabular-inference-prototype
```

Install dependencies:

```bash
uv sync
```

This recreates the local virtual environment from `pyproject.toml` and `uv.lock`.

## Run the Backend

Start FastAPI:

```bash
uv run uvicorn tabular_inference_prototype.main:app --reload
```

If successful:

```text
Uvicorn running on http://127.0.0.1:8000
```

## API Documentation

Open:

```text
http://127.0.0.1:8000/docs
```

FastAPI automatically generates this Swagger UI for testing the backend.

## Current API

### GET `/hello`

Health-check endpoint.

Example response:

```json
{
  "message": "hello"
}
```

### POST `/predict`

Inputs:

- `file`: CSV file
- `target_column`: target column name

Example:

```text
file: sample_customers.csv
target_column: default
```

Current backend flow:

```text
CSV upload
    ↓
pandas DataFrame
    ↓
validate target column
    ↓
split X and y
    ↓
train/test split
    ↓
TabICL inference
    ↓
JSON predictions
```

## TabICL

TabICL is the current tabular foundation model backbone.

It is installed as a project dependency:

```bash
uv add tabicl
```

On first use, TabICL downloads its pretrained checkpoint if the checkpoint is not already cached locally.

The uploaded dataset does not retrain the pretrained model weights. Training rows are used as inference context for in-context learning.

## Example Dataset

`sample_customers.csv` is a synthetic development dataset.

Example columns:

```text
age
income
balance
tenure_years
region
default
```

`default` is the example target column.

## Development Dependencies

Jupyter support is installed as a development dependency:

```bash
uv add --dev ipykernel
```

It is only needed for notebook experimentation.

## Notes

Do not copy `.venv` between machines.

On a new machine, copy or clone the project and run:

```bash
uv sync
```

`uv.lock` helps reproduce the same dependency versions.

## Current Status

```text
Backend proof-of-concept complete
```

Next planned steps:

```text
Frontend
↓
drag-and-drop CSV upload
↓
target column dropdown
↓
run prediction
↓
display prediction results
```
