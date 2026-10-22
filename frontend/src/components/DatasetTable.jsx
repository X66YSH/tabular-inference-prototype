import { useId, useMemo } from "react";
import { Button, ErrorPanel, Icon, Spinner } from "./ui";

const TYPES = { numeric: "Numerical", categorical: "Categorical", date: "Date" };
const number = (value) => Number(value ?? 0).toLocaleString();

function cellValue(value) {
  if (value === null || value === undefined) return "";
  // Keep raw strings and complete numeric labels; formatting must not change data.
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function PageButton({ label, onClick, disabled, first, last, children }) {
  return (
    <button type="button" className="table-page-button inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-35" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {first || last ? (
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {first ? <path d="M5 5v10m10-10-5 5 5 5" /> : <path d="M15 5v10M5 5l5 5-5 5" />}
        </svg>
      ) : children}
    </button>
  );
}

export default function DatasetTable({
  preview,
  columnDetails = [],
  config = {},
  selectedColumn = null,
  onSelectColumn,
  loading = false,
  error,
  onRetry,
  onPageChange,
  predictionMap,
  predictionColumn = "Prediction",
  showPrediction = false,
}) {
  const pageInputId = useId();
  const metadata = useMemo(() => new Map(columnDetails.map((column) => [column.name, column])), [columnDetails]);
  const columns = preview?.columns ?? columnDetails.map((column) => column.name);
  const rows = preview?.rows ?? [];
  const offset = preview?.offset ?? 0;
  const limit = preview?.limit || 50;
  const total = preview?.filtered_rows ?? preview?.total_rows ?? rows.length;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  const excluded = new Set(config.excludedColumns ?? []);
  const canPrevious = offset > 0 && !loading && Boolean(onPageChange);
  const canNext = offset + limit < total && !loading && Boolean(onPageChange);
  const displayColumns = [];
  columns.forEach((name, index) => {
    displayColumns.push({ name, index });
    if (showPrediction && name === config.targetColumn) displayColumns.push({ name: predictionColumn, prediction: true });
  });
  if (showPrediction && !columns.includes(config.targetColumn)) displayColumns.push({ name: predictionColumn, prediction: true });

  function jumpToPage(event) {
    event.preventDefault();
    const nextPage = Number(event.currentTarget.elements.namedItem("page").value);
    if (!Number.isInteger(nextPage) || !onPageChange || loading) return;
    onPageChange((Math.min(pages, Math.max(1, nextPage)) - 1) * limit);
  }

  function renderHeader(column) {
    const detail = metadata.get(column.name);
    const target = !column.prediction && column.name === config.targetColumn;
    const selected = !column.prediction && column.name === selectedColumn;
    const isExcluded = !target && !column.prediction && excluded.has(column.name);
    const featureType = Object.hasOwn(config.featureTypes ?? {}, column.name) ? config.featureTypes[column.name] : detail?.detected_type;
    const isText = detail?.warnings?.some((warning) => /free text/i.test(warning));
    const header = (
      <>
        <span className="flex min-w-0 items-center gap-2">
          {column.prediction && <Icon name="sparkles" size={13} className="text-blue-600" />}
          <span className="truncate text-xs font-semibold" title={column.name}>{column.name}</span>
          {selected && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />}
        </span>
        <span className="table-column-meta mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-normal text-slate-500">
          {column.prediction ? <span className="table-role-badge rounded bg-blue-100/80 px-1.5 py-0.5 font-medium text-blue-700">Prediction</span> : <>
            <span>{TYPES[featureType] || "Automatic"}</span>
            {target && <span className="table-role-badge rounded bg-blue-100/80 px-1.5 py-0.5 font-medium text-blue-700">{showPrediction && config.mode === "evaluation" ? "Actual · Target" : "Target"}</span>}
            {isExcluded && <span className="table-role-badge rounded bg-slate-200/80 px-1.5 py-0.5 font-medium text-slate-600">Excluded</span>}
            {isText && !target && <span className="table-role-badge rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800">Text</span>}
          </>}
        </span>
      </>
    );
    const stateClass = [target && "is-target", selected && "is-selected", isExcluded && "is-excluded", column.prediction && "is-prediction"].filter(Boolean).join(" ");
    return (
      <th key={column.prediction ? "__prediction__" : `${column.index}-${column.name}`} scope="col" className={`table-column-header sticky top-0 z-20 border-b border-r border-slate-200 text-left text-slate-700 ${stateClass} ${selected ? "bg-blue-50 shadow-[inset_0_2px_0_#3b82f6]" : target || column.prediction ? "bg-blue-50/95" : "bg-slate-50"}`}>
        {onSelectColumn && !column.prediction ? (
          <button type="button" className="table-header-button block w-full max-w-64 px-4 py-3 text-left transition-colors hover:bg-blue-50 focus-visible:relative focus-visible:z-30" onClick={() => onSelectColumn(column.name)} aria-label={`Inspect column ${column.name}`} aria-pressed={selected} title={`Inspect ${column.name}`}>
            {header}
          </button>
        ) : <div className="table-header-content max-w-64 px-4 py-3">{header}</div>}
      </th>
    );
  }

  return (
    <div className="wb-table-shell min-w-0 overflow-hidden rounded-b-2xl bg-white/95">
      {error && <div className="border-b border-slate-200/70 p-4"><ErrorPanel message={typeof error === "string" ? error : error.message} onRetry={onRetry} disabled={loading} retryLabel="Reload table" /></div>}
      <div className="wb-table-scroll relative overflow-auto overscroll-contain" aria-busy={loading} tabIndex={0} role="region" aria-label={showPrediction ? "Results table. Scroll to explore all columns." : "Dataset table. Scroll to explore all columns."}>
        <table className="wb-data-table w-full border-separate border-spacing-0 text-left text-xs">
          <caption className="sr-only">{showPrediction ? "Original dataset with aligned predictions" : "Uploaded dataset, read only"}. Row numbers start at 1. Long values remain available in full to assistive technology and on hover.{onSelectColumn ? " Select a column header to inspect its settings." : ""}</caption>
          <thead>
            <tr>
              <th scope="col" className="table-row-number sticky left-0 top-0 z-30 w-14 min-w-14 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-right text-[10px] font-medium text-slate-500" title="Original data row number, starting at 1">Row</th>
              {displayColumns.map(renderHeader)}
            </tr>
          </thead>
          <tbody className={loading ? "opacity-50" : ""}>
            {rows.map((row) => (
              <tr key={row.row_index} className="table-data-row group">
                <th scope="row" className="table-row-number sticky left-0 z-10 border-b border-r border-slate-200/75 bg-slate-50 px-3 py-2.5 text-right font-mono text-[11px] font-normal text-slate-500 group-hover:bg-blue-50" title={`Original row index: ${row.row_index} (zero-based)`}>
                  {number(row.row_index + 1)}
                </th>
                {displayColumns.map((column) => {
                  const target = !column.prediction && column.name === config.targetColumn;
                  const selected = !column.prediction && column.name === selectedColumn;
                  const isExcluded = !target && !column.prediction && excluded.has(column.name);
                  const predicted = column.prediction ? predictionMap?.get(row.row_index) : undefined;
                  const missing = !column.prediction && row.missing?.[column.index] === true;
                  const missingTarget = target && missing;
                  const value = column.prediction ? predicted?.prediction : row.values[column.index];
                  const text = cellValue(value);
                  const stateClass = [target && "is-target", selected && "is-selected", isExcluded && "is-excluded", column.prediction && "is-prediction", missingTarget && "is-missing-target"].filter(Boolean).join(" ");
                  return (
                    <td key={column.prediction ? "__prediction__" : column.index} className={`table-cell border-b border-r border-slate-200/60 px-4 py-2.5 text-slate-700 group-hover:bg-blue-50/35 ${stateClass} ${missingTarget ? "bg-rose-50/70" : selected || column.prediction ? "bg-blue-50/35" : isExcluded ? "bg-slate-50/60" : ""}`} title={missing ? "Missing value" : column.prediction && !predicted ? "This row was not predicted" : text}>
                      {missingTarget ? (
                        <span className="table-missing-target inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-rose-100 bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700"><span className="size-1 rounded-full bg-rose-400" aria-hidden="true" />{showPrediction ? "Was missing" : config.mode === "evaluation" ? "Missing" : "To predict"}</span>
                      ) : missing ? (
                        <span className="table-missing-value text-[11px] text-slate-500">—<span className="sr-only"> Missing value</span></span>
                      ) : column.prediction && !predicted ? (
                        <span className="text-slate-500">—<span className="sr-only"> Not predicted</span></span>
                      ) : (
                        <span className={`table-cell-value block max-w-60 truncate whitespace-pre ${column.prediction ? "font-medium text-blue-700" : isExcluded ? "text-slate-500" : ""}`} aria-label={text}>{text || <span className="text-slate-500">Empty string</span>}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="flex min-h-60 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-500" role="status">
            {loading ? <><Spinner className="text-blue-500" /><p>Loading dataset rows…</p></> : <><Icon name="table" size={24} className="text-slate-400" /><p>{error ? "The table could not be loaded." : "No rows match this view."}</p></>}
          </div>
        )}
      </div>
      <div className="table-pagination flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
        <p className="flex items-center gap-2 text-[11px] text-slate-500" role="status" aria-live="polite" aria-atomic="true">
          {loading && <Spinner className="text-blue-500" />}
          {loading ? "Loading rows…" : total ? `${number(offset + 1)}–${number(Math.min(offset + rows.length, total))} of ${number(total)} rows` : "0 rows"}
          {!loading && preview && total !== preview.total_rows && <span className="hidden text-slate-500 sm:inline">· {number(preview.total_rows)} total</span>}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="hidden text-[10px] text-slate-500 lg:block">{limit} rows per page</span>
          <nav className="flex items-center gap-1" aria-label="Table pagination">
            <PageButton label="First page" first disabled={!canPrevious} onClick={() => onPageChange(0)} />
            <PageButton label="Previous page" disabled={!canPrevious} onClick={() => onPageChange(Math.max(0, offset - limit))}><Icon name="arrowLeft" size={14} /></PageButton>
            <form className="mx-1 flex items-center gap-1.5 text-[11px] text-slate-500" onSubmit={jumpToPage} aria-label="Jump to table page">
              <label htmlFor={pageInputId} className="sr-only">Page number</label>
              <input key={`${offset}-${total}`} id={pageInputId} name="page" type="number" min={1} max={pages} step={1} defaultValue={Math.min(page, pages)} disabled={loading || !onPageChange || !total} className="table-page-input h-8 w-12 rounded-lg border border-slate-200 bg-slate-50 px-1 text-center text-xs font-medium text-slate-700 disabled:opacity-50" aria-label="Page number" title="Enter a page number and press Enter" />
              <span className="whitespace-nowrap">of {number(pages)}</span>
            </form>
            <PageButton label="Next page" disabled={!canNext} onClick={() => onPageChange(offset + limit)}><Icon name="arrowRight" size={14} /></PageButton>
            <PageButton label="Last page" last disabled={!canNext} onClick={() => onPageChange((pages - 1) * limit)} />
          </nav>
        </div>
      </div>
      {!preview && !loading && !error && onRetry && <div className="border-t border-slate-200 p-3 text-center"><Button variant="ghost" onClick={onRetry}>Load dataset rows</Button></div>}
    </div>
  );
}
