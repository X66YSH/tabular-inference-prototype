# Tabular AI Workbench

A local tabular AI workbench for exploring CSV/XLSX data, predicting missing
outcomes, and evaluating labeled data. React provides the interactive table;
FastAPI and local TabICLv2 checkpoints provide inspection and inference.

## Quick start (existing environment)

From the repository root, open two terminals. Keep both processes running.

**Terminal 1 — backend (macOS/Linux):**

```bash
PYTHONPATH=src .venv/bin/python -m uvicorn tabular_inference_prototype.main:app --reload
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
```

Open the URL printed by Vite, normally **http://localhost:5173**. If that port
is occupied, Vite may choose another one. Backend API documentation is at
**http://127.0.0.1:8000/docs**; **http://127.0.0.1:8000/hello** checks connectivity.
Use `Ctrl+C` in each terminal to stop the application.

For a fresh checkout, complete [Setup](#setup) and place the local
[model checkpoints](#tabicl) before running inference. Upload and inspection do
not require model checkpoints. Try **Try Sample Dataset** for the built-in
Prediction example.

## Workflows

Upload CSV or XLSX, select a target and task type (classification or regression),
and review feature types and warnings.

- **Prediction (default):** all rows with known targets provide context. Rows with
  missing targets are the query rows; there is no train/test split. At least two
  labeled context rows and one query row are required, with at least two distinct
  classes for classification.
- **Evaluation:** requires a fully labeled target. An 80/20 split holds out test
  rows, stratified for classification when feasible. An unstratified fallback is
  reported; a split that leaves a class without context is rejected. At least
  three labeled rows are required; classification also needs two distinct classes.

Both modes support **Classification** for discrete labels and **Regression**
for numerical outcomes. The target is never an input feature. View filters do
not change inference context or select query rows manually.

Both workflows return every prediction with its zero-based original data-row
position. Downloads preserve the uploaded columns and row order, adding
`<target>_prediction` only on predicted rows. Prediction also adds
`<target>_completed`, combining known labels and predictions. Existing columns
are never overwritten; suffixes resolve name collisions. XLSX inputs download as
CSV, without workbook formatting.

## Project Structure

```text
tabular-inference-prototype/
├── src/
│   └── tabular_inference_prototype/
│       ├── __init__.py
│       ├── main.py
│       ├── model.py
│       ├── preprocessing.py
│       └── model_weights/      # Local classifier/regressor checkpoints
├── sample_customers.csv
├── pyproject.toml
├── requirements.txt
├── requirements-dev.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Dataset / Results shell and session state
│   │   ├── components/        # Table, Inspector, upload and results views
│   │   ├── lib/               # API requests, preview cache and configuration
│   │   └── index.css          # Responsive layout and shared styles
│   ├── package.json
│   └── vite.config.js         # /api → local FastAPI proxy
├── tests/
│   ├── test_api.py
│   └── test_preprocessing.py
└── README.md
```

## Requirements

- Python 3.11 or newer (the setup commands below use 3.11)
- pip (included with standard Python installations)
- Node.js `20.19.x` or newer within Node 20, or Node.js `22.12.0+`, with npm
  (matching the installed Vite package's engine requirement)
- Local TabICLv2 classifier and/or regressor checkpoint for the selected task

Check the installed tools:

```bash
python3.11 --version
node --version
npm --version
```

## Setup

Enter the project directory:

```bash
cd tabular-inference-prototype
```

Create and activate a virtual environment (macOS/Linux):

```bash
python3.11 -m venv .venv
source .venv/bin/activate
```

On Windows, use `py -3.11 -m venv .venv` and activate it with
`.venv\Scripts\Activate.ps1` in PowerShell.

Install dependencies and the local package:

```bash
python -m pip install -r requirements.txt -e .
```

Install frontend dependencies once, then return to the repository root:

```bash
cd frontend
npm install
cd ..
```

`requirements.txt` is the dependency source of truth. `pyproject.toml` reads it
when installing the project. The editable installation (`-e .`) makes the package
under `src/` importable and reflects source edits without reinstalling.

If reusing an existing environment that has no pip, activate it and run
`python -m ensurepip --upgrade` first.

## Run the Backend

After activating `.venv` and installing the package as above, start FastAPI from
the repository root (this also works in Windows PowerShell):

```bash
python -m uvicorn tabular_inference_prototype.main:app --reload
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

## Run the Frontend

```bash
cd frontend
npm run dev
```

The Vite development server proxies `/api` requests to the backend on port 8000.

## Using the workspace

The workbench has two persistent navigation destinations:

- **Dataset:** drag and drop or browse for CSV/XLSX, or choose **Try Sample
  Dataset**. The uploaded table opens immediately after inspection. Browse all
  rows in pages of 50, select a target, and switch between Prediction and
  Evaluation in the workspace. **All Rows**, **To Predict**, and **Labeled**
  filters change the view only. Selecting a column opens its inspector with
  metadata, review notes, inclusion controls, and optional type overrides.
  Excluded columns remain visible, and missing target cells are marked clearly.
  In Evaluation, the missing-row filter is labeled **Missing labels**, so it is
  distinct from held-out test rows.
- **Results:** inspect predictions beside their original data, filter to
  predicted or held-out rows, review available evaluation metrics, and download
  the completed CSV. Configuration changes clear stale results. Inspection,
  preview, and inference errors can be retried without selecting the file again.

Prediction is the default. The run action shows the current context/query counts
and uses an indeterminate indicator during inference. Table row numbers are
one-based for display; API `row_index` values are zero-based, so displayed row 1
corresponds to API row 0. The table is read-only; selecting features or filtering
rows does not edit the uploaded dataset.

### Column Inspector layout

On desktop, the Inspector fills the table card's height without sizing the grid
row itself. Table rows and Inspector settings scroll independently; the Inspector
header and close button remain visible. Opening, switching, or closing a column
does not push the Run Prediction bar down or add empty space beneath the table.
The action bar retains its existing sticky positioning on larger screens.

At widths of 1023px or less, the Inspector becomes a viewport-constrained drawer
with an independently scrolling body. Escape closes it, keyboard focus stays
within the drawer, and closing restores focus. Small mobile layouts keep the run
action in the normal page flow. Reduced-motion preferences are respected.

The interface uses local assets and system fonts. It does not add analytics,
external AI requests, browser storage, or saved prediction history. See
[`frontend/README.md`](frontend/README.md) for component structure and checks.

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

- `file`: CSV or XLSX file
- `target_column`: target column name
- `mode`: `prediction` (default) or `evaluation`
- `task_type`: `classification` (default) or `regression`
- `excluded_columns`: JSON array of feature names, default `[]`
- `feature_types`: JSON object mapping feature names to `numeric`, `categorical`,
  or `date`, default `{}`

Example:

```text
file: sample_customers.csv
target_column: default
mode: evaluation
```

`sample_customers.csv` is fully labeled, so select Evaluation. For a ready-made
Prediction example, choose **Try Sample Dataset** in the frontend. Alternatively,
make a copy of `sample_customers.csv` and clear some values in `default`, keeping
labeled examples of both classes.

The existing `prediction` response field now contains **all** predicted values.
`row_indices` gives their aligned original positions; `predictions` contains
records with `row_index`, `prediction`, and, in Evaluation, `actual`.
`preprocessing` is separate metadata with shapes, context/query counts, applied
types, conversions, exclusions, split strategy, and warnings.

`metrics` is `null` in Prediction. Evaluation returns `accuracy` and `f1_macro`
for classification, or `mae`, `rmse` and `r2` for regression. R² is `null` when the
test set has fewer than two rows or the calculated score is non-finite.
`prediction_column` and `completed_target_column` identify the generated columns;
the latter is `null` in Evaluation. `download` contains `filename`, `content_type`
and `content` for the frontend's CSV download button. The application does not
keep a server-side dataset session or database.

### POST `/inspect`

Accepts multipart field `file` and returns dataset dimensions, column details,
missing counts, type suggestions, duplicate names and warnings. Existing
metadata fields are preserved. The additional `preview` field contains the first
50 original rows, using the response shape described below. Inspection performs
no inference and does not modify the uploaded file.

### POST `/preview`

Returns a page of original data using the same CSV/XLSX parser and missing-value
rules as inference. Multipart inputs:

| Field | Default | Meaning |
| --- | --- | --- |
| `file` | Required | The uploaded CSV/XLSX file, sent with each request. |
| `offset` | `0` | Nonnegative offset within the filtered rows. |
| `limit` | `50` | Page size, from 1 to 100. |
| `target_column` | Omitted | Column used by missing/labeled filters. |
| `row_filter` | `all` | `all`, `missing`, or `labeled`. |
| `row_indices` | Omitted | JSON array of unique zero-based original row positions, such as `[1,4,8]`. |

Missing/labeled filters require a valid target with a unique column name.
`row_indices` optionally restricts the page to predicted or held-out rows; `[]`
returns no rows. When both filters are supplied, their intersection is used.
Filtering happens before pagination, and results always retain original dataset
order, regardless of the order supplied in `row_indices`.

Example response for a missing-target filter:

```json
{
  "columns": ["account_id", "balance", "target"],
  "total_rows": 2,
  "filtered_rows": 1,
  "offset": 0,
  "limit": 50,
  "rows": [
    {
      "row_index": 1,
      "values": ["DEMO-002", "1.2300", null],
      "missing": [false, false, true]
    }
  ]
}
```

`values` and `missing` are positional arrays aligned with `columns`; duplicate
headers can therefore still be displayed, although inference rejects them.
`total_rows` counts the complete dataset and `filtered_rows` counts matching rows
before pagination. An offset beyond the filtered results returns an empty page.

CSV values retain their original strings, including leading zeros, whitespace,
large integers, and numeric formatting. XLSX previews use stored cell values,
without workbook display formatting. Dates use ISO strings. Native integers
outside JavaScript's safe integer range are returned as strings to preserve
precision, and native infinities become `"inf"`/`"-inf"` with `missing: false`.
Pandas missing values become `null` with `missing: true`. Standard markers such
as `NA` are missing; whitespace-only values remain present. Consumers should use
the supplied missing flags instead of trimming strings or inferring missingness.

Invalid pagination bounds/types return HTTP 422; invalid targets or row-position
arrays return actionable HTTP 400 errors. Preview filters do not change the
context, query rows, or evaluation split used by `/predict`.

Preview requests are stateless: no server dataset cache, database, or session is
created. `/inspect` captures its initial page from the same parsed table used for
metadata. Each subsequent uncached page request uploads and parses the full file
again, returning at most 100 rows. The frontend keeps up to eight pages in memory
and clears that cache when the file changes. This bounds rendered rows and avoids
a second full dataset in browser memory, at the cost of repeated upload/parsing
work for large files. The cache is not written to browser storage.

## Preprocessing and validation

`preprocessing.py` provides `inspect_dataset`, `suggest_feature_types`,
`validate_target` and `prepare_features`. Feature decisions are made from context
rows and applied identically to query rows. The target is never an input feature.
Missing targets are query rows in Prediction and an error in Evaluation; no rows
are silently discarded.

- Unambiguous numeric strings such as `$1,234.50` and `45,000` become numbers.
  Percentages become fractions (`12.5%` → `0.125`). Ambiguous grouping, mixed
  percentage units or conflicting currencies require correction or a categorical
  override; this does not perform currency conversion.
- Leading-zero codes stay categorical. Specific identifier/personal-field names,
  identifier-like categorical values, high-cardinality categories, free text,
  and possible outcome columns are flagged for review. Numeric IDs can be
  recognized by names such as `customerID` or `account_number`. Ordinary numeric
  columns such as income and balance are not flagged merely for high uniqueness.
  Generic integer-category warnings are suppressed; categorical overrides remain
  available. No suspected feature is automatically removed.
- ISO dates and native spreadsheet dates become year, month and weekday
  (Monday = 0). Ambiguous date strings remain categorical unless cleaned.
- Missing features are preserved for TabICL. Categorical values are represented
  consistently as strings. TabICL handles encoding, imputation, scaling and
  normalization using context only.
- Duplicate headers, invalid targets, incompatible feature overrides and an
  empty feature selection return informative HTTP 400 errors.

Choose the task type explicitly and review exclusions/type overrides. Name-based
leakage warnings cannot establish whether a feature was available at prediction
time. Parsing uses pandas' standard missing-value markers, so literal strings
such as `NA` are treated as missing. Only the first XLSX sheet is read.

Small contexts and rare classes trigger reliability warnings. The default
prototype resource warnings are 10,000 context rows and 500 features, adjustable
through `size_warning_thresholds` in the preprocessing functions. These are soft
warnings, not limits. The implementation also emits range guidance for inputs
outside 300–48,000 context rows or 2–100 features; this does not prevent inference.

## TabICL

TabICL is the current tabular foundation model backbone.

It is included in `requirements.txt` and installed during setup. To install it separately:

```bash
python -m pip install tabicl
```

Automatic checkpoint downloads are disabled. Place the corresponding checkpoint
in `src/tabular_inference_prototype/model_weights/`:

- `tabicl-classifier-v2-20260212.ckpt`
- `tabicl-regressor-v2-20260212.ckpt`

A missing checkpoint returns HTTP 503. The existing local `fit`/`predict` flow is
preserved, choosing the estimator for the selected task.

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

`default` is the example target column. This file is fully labeled and is suitable
for Evaluation mode.

The frontend's **Try Sample Dataset** action creates a separate deterministic,
entirely synthetic `synthetic-renewals.csv` in memory. Its 80 rows include numeric
and categorical features, dates, and 15 missing `renewal` outcomes. The action
selects `renewal` as the target and opens Prediction mode, ready for inspection
and inference. The generator lives in `frontend/src/lib/sampleDataset.js`; it
contains no actual customer data.

## Development Dependencies

Install the test client and run the focused preprocessing/API tests:

```bash
python -m pip install -r requirements-dev.txt -e .
python -m unittest discover -s tests -v
```

The automated tests mock model inference to check workflow behavior without
requiring checkpoints. They also cover CSV/XLSX previews, complete pagination,
missingness shared with inference, row filtering/alignment, raw-value precision,
duplicate headers, and input validation. Production frontend checks:

```bash
cd frontend
npm run build
npm run lint
```

Jupyter support (`ipykernel`) is included in `requirements.txt` for notebook experimentation.
After activating the environment, register it as a notebook kernel:

```bash
python -m ipykernel install --user --name tabular-inference-prototype --display-name "Tabular Inference Prototype"
```

It is only needed for notebook experimentation.

## Notes

Do not copy `.venv` between machines.

On a new machine, copy or clone the project, then create and activate a virtual
environment as shown above and run:

```bash
python -m pip install -r requirements.txt -e .
```

`requirements.txt` pins direct Python runtime dependencies with `==`;
`requirements-dev.txt` adds a version range for `httpx`. These files do not lock
the full transitive dependency graph. Fresh installations may resolve different
transitive versions. Frontend dependency declarations live in `frontend/package.json`.
When adding a Python runtime dependency, update `requirements.txt` and rerun the installation command;
`pip install` alone does not update the file.

The prototype returns CSV content together with JSON results, so large uploads
and downloads are held in memory. Size warnings do not guarantee that a dataset
fits the available inference resources.

## Troubleshooting and current limits

| Symptom | What to check |
| --- | --- |
| Unable to connect, or `/api` returns a proxy error | Keep FastAPI running on `127.0.0.1:8000`; check `/hello`. If you change the backend port, update `frontend/vite.config.js` to match. |
| `No module named tabular_inference_prototype` | Use the root-level quick-start command with `PYTHONPATH=src`, or activate `.venv` and install the project with `python -m pip install -e .`. |
| Local checkpoint missing / HTTP 503 | Place the checkpoint for the selected task at the path listed in [TabICL](#tabicl). Automatic downloads are disabled. |
| No rows to predict | Select a target with missing values, or explicitly switch to Evaluation for a fully labeled target. |
| Evaluation rejects the dataset | Every target must be labeled; classification also needs enough examples to retain all classes in the training context. |
| Duplicate column names | Rename headers in the source file and upload it again. Preview supports duplicates, but inference does not. |
| Preview response is unexpected | Restart the backend after updating code so it serves the current `/inspect` and `/preview` contracts. |

- Only the first XLSX sheet is read. CSV inputs must be UTF-8 and have non-empty
  headers. Spreadsheet styles and formulas are not editable in the workbench.
- CSV exports preserve columns and row alignment, but are not a byte-for-byte
  copy of the upload: pandas parsing/serialization may normalize numeric formatting
  and missing-value markers. The read-only preview preserves parsed source values.
- Uncached preview pages upload and parse the file again. Only a page is rendered,
  but large files and full prediction/download responses still use memory.
- Current frontend target checks use detected types: date-detected columns are
  blocked for Classification, and Regression requires a numeric-detected target.
  These preliminary checks can be stricter than backend validation for unusual
  string labels or leading-zero numeric targets.
- Reloading the browser clears the workspace. There is no saved history,
  authentication, database, cell editing, sorting, or manual query-row selection.
- `npm run build` generates `frontend/dist`. The Vite development proxy is not
  bundled into those static files; production serving needs its own `/api` routing.
