import DatasetTable from "./DatasetTable";
import ColumnInspector from "./ColumnInspector";
import { Button, ErrorPanel, Icon, Spinner, WarningPanel } from "./ui";
import { summarize } from "../lib/configuration";

export default function DatasetPage({ inspection, config, onChange, onTarget, onToggle, onType, selectedColumn, onSelectColumn, onCloseInspector, preview, previewLoading, previewError, onPreviewRetry, onPageChange, filter, onFilterChange, busy, validation, error, onRun }) {
  const summary = summarize(inspection, config);
  const evaluation = config.mode === "evaluation";
  const selected = inspection.column_details.find((column) => column.name === selectedColumn);
  const duplicates = Boolean(inspection.duplicate_columns?.length);
  const featureWarnings = new Set(inspection.column_details.flatMap((column) => column.warnings || []));
  const datasetWarnings = (inspection.warnings || []).filter((warning) => !featureWarnings.has(warning));
  const warningColumns = inspection.column_details.filter((column) => column.name !== config.targetColumn && !config.excludedColumns.includes(column.name) && column.warnings?.length);
  const readyMessage = evaluation
    ? `Ready to evaluate ${summary.query.toLocaleString()} held-out rows using ${summary.context.toLocaleString()} examples and ${summary.features} features.`
    : `Ready to predict ${summary.query.toLocaleString()} rows using ${summary.context.toLocaleString()} labeled examples and ${summary.features} features.`;

  return <div className="wb-dataset-page">
    <div className="wb-page-heading">
      <div><p className="wb-eyebrow">YOUR DATA WORKSPACE</p><h1 tabIndex={-1} data-page-heading>Make every row count.</h1><p>Explore your table. Choose an outcome. See what comes next.</p></div>
      <div className="wb-mode-switch" role="group" aria-label="Inference mode">
        {[['prediction', 'Prediction', 'sparkles'], ['evaluation', 'Evaluation', 'chart']].map(([value, label, icon]) => <button type="button" key={value} aria-pressed={config.mode === value} disabled={busy} onClick={() => onChange({ mode: value })}><Icon name={icon} size={15} />{label}</button>)}
      </div>
    </div>

    <div className="wb-config-bar">
      <label className="wb-inline-field"><span><Icon name="sparkles" size={15} />Target column</span><select aria-label="Target column" value={config.targetColumn} disabled={busy || duplicates} onChange={(event) => onTarget(event.target.value)}><option value="">Select a column…</option>{inspection.column_details.map((column, index) => <option key={index} value={column.name}>{column.name}</option>)}</select></label>
      <span className="wb-config-divider" />
      <label className="wb-inline-field"><span>Task</span><select aria-label="Task" value={config.taskType} disabled={busy} onChange={(event) => onChange({ taskType: event.target.value })}><option value="classification">Classification · categories</option><option value="regression">Regression · numbers</option></select></label>
      <span className="wb-config-help"><Icon name="info" size={14} />{evaluation ? "80% examples · 20% evaluation" : "Known outcomes → missing outcomes"}</span>
    </div>

    <div className="wb-dataset-summary" aria-label="Dataset summary">
      {[[evaluation ? "Labeled rows" : "Context rows", summary.target ? summary.labeled : "—", "rows"], [evaluation ? "Evaluation rows" : "To predict", summary.target ? (evaluation && summary.missing ? "—" : summary.query) : "—", "sparkles"], ["Input features", summary.features, "layers"]].map(([label, value, icon]) => <div key={label}><span className="wb-summary-icon"><Icon name={icon} size={17} /></span><span className="wb-summary-label">{label}</span><strong>{typeof value === "number" ? value.toLocaleString() : value}</strong></div>)}
      <p className="wb-summary-note"><Icon name="shield" size={14} />{evaluation ? "Original answers stay intact" : "Original values stay intact"}</p>
    </div>

    {datasetWarnings.length > 0 && <WarningPanel warnings={datasetWarnings} compact title="Dataset notes" />}
    <div className={`wb-dataset-layout ${selected ? "has-inspector" : ""}`}>
      <div className="wb-data-surface">
        <div className="wb-table-toolbar">
          <div className="wb-row-filters" role="group" aria-label="Dataset row filter">
            {[["all", "All Rows", inspection.rows], ["missing", evaluation ? "Missing labels" : "To Predict", summary.missing], ["labeled", "Labeled", summary.labeled]].map(([value, label, count]) => <button type="button" key={value} aria-pressed={filter === value} disabled={value !== "all" && (!summary.target || duplicates)} onClick={() => onFilterChange(value)}>{label}<span>{summary.target || value === "all" ? count.toLocaleString() : "—"}</span></button>)}
          </div>
          <span className="wb-table-hint"><Icon name="table" size={14} />Read-only</span>
        </div>
        <DatasetTable preview={preview} columnDetails={inspection.column_details} config={config} selectedColumn={selectedColumn} onSelectColumn={duplicates ? undefined : onSelectColumn} loading={previewLoading} error={previewError} onRetry={onPreviewRetry} onPageChange={onPageChange} />
        <div className="wb-table-caption"><span><Icon name="info" size={13} />Click a column header to inspect or configure it.</span>{warningColumns.length > 0 && <span className="wb-review-note">{warningColumns.length} {warningColumns.length === 1 ? "column has" : "columns have"} review notes</span>}</div>
      </div>
      {selected && <ColumnInspector column={selected} config={config} busy={busy} onClose={onCloseInspector} onTarget={onTarget} onToggle={onToggle} onType={onType} />}
    </div>

    <div className="wb-run-area">
      {error && <ErrorPanel message={error} onRetry={onRun} retryLabel={evaluation ? "Retry evaluation" : "Retry prediction"} disabled={busy || Boolean(validation)} />}
      <div className={`wb-run-panel ${busy ? "is-running" : ""}`}>
        <span className="wb-run-symbol">{busy ? <Spinner /> : <Icon name={validation ? "info" : "sparkles"} size={20} />}</span>
        <div className="wb-run-copy" aria-live="polite"><p>{busy ? "Running TabICL inference…" : validation ? "A quick check before you run" : "Ready when you are"}</p><span>{busy ? "This can take a little time. Your dataset and configuration are kept in place." : validation || readyMessage}</span></div>
        <Button disabled={busy || Boolean(validation)} onClick={onRun}>{busy ? <><Spinner />Processing</> : <><Icon name="sparkles" size={16} />Run {evaluation ? "Evaluation" : "Prediction"}<Icon name="arrowRight" size={15} /></>}</Button>
      </div>
    </div>
  </div>;
}
