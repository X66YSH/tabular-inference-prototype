# Tabular AI Workbench

A React + Vite + Tailwind CSS workspace for local TabICLv2 inference. Dataset and
Results share one application shell; there is no mandatory step-by-step wizard.
System fonts, local SVG icons, translucent navigation and readable opaque tables
keep the interface self-contained.

## Run

For initial Python setup and local checkpoint filenames, see the
[project README](../README.md). The frontend requires Node.js `^20.19.0 || >=22.12.0`
and npm, matching the installed Vite package. Install frontend dependencies with
`npm install` from this directory if needed.

Start the backend from the repository root:

```bash
PYTHONPATH=src .venv/bin/python -m uvicorn tabular_inference_prototype.main:app --reload
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open the address printed by Vite, normally `http://localhost:5173`. Keep both
terminals running. Stop each process with `Ctrl+C`.

The existing Vite proxy forwards `/api/inspect`, `/api/preview`, and `/api/predict`
to `http://127.0.0.1:8000`. Production static hosting needs an equivalent proxy;
`npm run build` does not deploy the Python backend.

## Explore and predict

- Upload a CSV/XLSX, or choose **Try Sample Dataset**. The sample contains 80
  entirely synthetic renewal records, 65 labeled examples and 15 missing outcomes.
  Its target is selected for convenience; uploaded files require an explicit choice.
- Browse every row using pages of 50, first/last controls, or a page-number input.
  The table scrolls in both directions and keeps column headings and row numbers visible.
- Select a target from the toolbar or click a column header and use the inspector.
  The inspector controls inclusion and automatic/numeric/categorical/date types.
  Excluded columns remain visible. The target cannot be an input feature.
- Filter **All Rows**, **To Predict**, or **Labeled**. These change only the view.
  Backend missing-value masks determine both row filters and cell highlights.
- Prediction is the default: every known target is an example, every missing target
  is a query, with no random split. Evaluation requires fully labeled data and uses
  the existing 80/20 split. The UI does not silently switch modes.
- Run inference from the workspace. Controls prevent duplicate requests, preserve
  configuration on failure, and show indeterminate progress with a retry action.
- Results show source features, the original target, and a separate prediction
  column. Filter predicted/held-out rows or browse the entire dataset. Metrics come
  from the backend; elapsed time measures the actual prediction request.
- Download the backend-generated CSV. Changing data or inference settings clears
  results and explains that another run is required. Selecting columns and browsing
  pages do not invalidate results or invoke inference.

## Components and state

- `src/App.jsx`: application shell, session state, upload/run guards, navigation,
  configuration and result invalidation.
- `src/components/UploadWorkspace.jsx`: accessible upload, drag-and-drop and sample action.
- `src/components/DatasetPage.jsx`: target/task/mode controls, summaries, filters and run panel.
- `src/components/DatasetTable.jsx`: shared read-only grid, stable source rows and pagination.
- `src/components/ColumnInspector.jsx`: contextual metadata, feature controls and mobile drawer.
- `src/components/ResultsPage.jsx`: aligned results, actual metrics, export and preparation notes.
- `src/components/ui.jsx`: shared icons, buttons, loading and feedback.
- `src/lib/api.js`: multipart requests, response checks and CSV download lifecycle.
- `src/lib/usePreview.js`: abortable requests, stale-response protection and an eight-page cache.
- `src/lib/configuration.js`: derived counts and user-facing validation.
- `src/lib/sampleDataset.js`: deterministic synthetic example generation.
- `src/index.css`: shell, restrained glass surfaces, dense table styling, responsive
  layout, visible focus and reduced-motion support.

On narrow screens the inspector is a drawer with Escape-to-close, trapped keyboard
focus and focus restoration. Table values are read-only and never content-editable.
Long values remain in full in the DOM and in cell tooltips.

### Independent table and Inspector scrolling

The desktop table determines the grid row height. `.wb-inspector-shell` stretches
to that height with `min-height: 0`; the absolutely positioned `.wb-inspector`
fills it without contributing its content height to the grid. Inside the panel,
the header is non-shrinking and `.wb-inspector-body` uses `flex: 1`, `min-height: 0`
and `overflow-y: auto`. Table scrolling remains on `.wb-table-scroll`.

This keeps the page height and Run Prediction position stable when columns are
opened, switched or closed. No additional fixed panel height is needed. At
1023px and below, the shell leaves grid flow and the panel uses the existing
viewport-inset drawer bounds; its settings still scroll beneath the visible header.

## Preview contract and alignment

`POST /inspect` returns existing metadata plus a `preview` containing the first 50
rows. Subsequent pages use `POST /preview` with the same uploaded file, an `offset`,
`limit=50`, optional target/missingness filter, and optional original row indices.
The backend applies filters before paging and keeps original order. A bounded
eight-page cache avoids repeated requests for recently visited views.

Preview rows contain `{row_index, values, missing}`. Values and missing masks are
positional arrays, so duplicate headers can be displayed even though inference is
blocked until they are renamed. Backend parsing is the single authority: whitespace
is not trimmed, and pandas' missing marker rules are preserved. Large integer
values are serialized as strings when needed to avoid browser precision loss.
Display row **1** maps to backend `row_index: 0`; each row-number tooltip makes this
explicit. Predictions join by original `row_index`, never by page position.

## Privacy and prototype limits

Uploads, bounded preview pages and results stay in memory for the current session.
There is no browser storage, analytics, external inference or persisted history.
Reloading clears the workspace. This is a prototype, not a banking compliance claim.

Preview requests are stateless: each uncached page reuploads and parses the file.
This avoids a dataset database/session service but adds latency for large files.
Only one page is rendered; the full result/download response still resides in memory.
XLSX previews show stored values and ISO dates, not spreadsheet number formatting;
exports are CSV and do not retain workbook styles. Identifier/free-text warnings
are review hints, not automatic exclusions. Backend target/model validation remains
authoritative for submitted runs, while the current frontend also blocks
date-detected classification targets and nonnumeric-detected regression targets.
These preliminary checks can reject unusual string labels that the backend accepts.
Cell editing, sorting, saved sessions and manual query selection are
outside this prototype's scope.

## Checks

```bash
npm run build
npm run lint
```

From the repository root:

```bash
PYTHONPATH=src .venv/bin/python -m unittest discover -s tests -v
```

Backend tests include preview pagination, CSV/XLSX parsing, missingness, original
row subsets, precision, invalid input, preprocessing and both inference workflows.

## Redesign verification (2026-10-21)

The following records checks performed during implementation; it is not a claim
that every checkout or subsequent change has been retested.

- Frontend production build and lint completed successfully.
- All 53 backend tests passed, including nine new preview regression tests.
- Sixteen browser regression groups passed using real inspection/preview endpoints
  and mocked inference for failure, validation and metrics edge cases. They cover
  complete pagination, raw values, filters, column settings, stale results, retries,
  duplicate submissions, result alignment and download content.
- Four additional browser workflows used actual local checkpoints: synthetic CSV
  prediction (15 query rows), CSV classification evaluation (80 held-out rows),
  XLSX regression prediction (4 query rows) and XLSX regression evaluation (4 held-out
  rows). Each checked source-row alignment and exact CSV download contents.
- Fresh browser contexts verified desktop 1440px, mobile 390px/320px, and accessible
  icon-only navigation at 800px. Sample/reset behavior, drawer keyboard focus,
  reduced-motion styling and browser errors were checked.

New files: the five workbench components `UploadWorkspace`, `DatasetPage`,
`DatasetTable`, `ColumnInspector`, `ResultsPage`, and the three helpers
`configuration.js`, `usePreview.js`, `sampleDataset.js`. Modified: `App.jsx`,
`index.css`, `lib/api.js`, `index.html`, backend `main.py`, `tests/test_api.py`,
and both READMEs. The six obsolete wizard components were removed. The existing
model, preprocessing, dependency lists and Vite proxy were preserved in this redesign.

The subsequent Inspector layout fix was checked at seven desktop/mobile viewport
sizes, including small laptops. Opening, switching and closing columns preserved
the measured table, grid and page heights and Run Prediction position. Short
tables and long Inspector content were also checked, along with independent
scrolling and the fixed Inspector header. Build and lint passed for that fix.
