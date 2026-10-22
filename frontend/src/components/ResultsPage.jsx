import { useMemo } from "react";
import DatasetTable from "./DatasetTable";
import { Button, Icon, WarningPanel } from "./ui";

const metricDefinitions = {
  accuracy: { label: "Accuracy", percentage: true, description: "Share of held-out rows predicted correctly. Higher is better." },
  f1_macro: { label: "Macro F1", percentage: true, description: "Balances precision and recall, weighting each class equally. Higher is better." },
  mae: { label: "MAE", fullLabel: "Mean absolute error", description: "Average prediction error in the target’s units. Lower is better." },
  rmse: { label: "RMSE", fullLabel: "Root mean squared error", description: "Error in the target’s units, emphasizing larger misses. Lower is better." },
  r2: { label: "R²", fullLabel: "R² score", description: "1 is a perfect fit; 0 matches a mean-value baseline. Negative values are worse." },
};
const number = (value) => typeof value === "number" ? value.toLocaleString() : "—";
const elapsed = (value) => value < 1000 ? "<1 s" : value < 60000 ? `${(value / 1000).toFixed(1)} s` : `${Math.floor(value / 60000)}m ${Math.floor((value % 60000) / 1000)}s`;

function Metric({ name, value }) {
  const metric = metricDefinitions[name];
  const available = typeof value === "number" && Number.isFinite(value);
  const formatted = available ? value.toLocaleString(undefined, metric.percentage ? { style: "percent", maximumFractionDigits: 2 } : { maximumFractionDigits: 4 }) : "Unavailable";
  return (
    <div className="results-metric min-w-0 rounded-xl border border-slate-200/70 bg-white/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-slate-500" title={metric.fullLabel || metric.label}>{metric.label}</p>
          <p className={`mt-1 font-semibold tracking-tight text-slate-900 tabular-nums ${available ? "text-2xl" : "text-lg"}`} title={available ? String(value) : undefined}>{formatted}</p>
        </div>
        <span className="rounded-lg bg-blue-50 p-1.5 text-blue-600"><Icon name="chart" size={14} /></span>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-slate-500">{available ? metric.description : "This metric could not be calculated for these held-out rows."}</p>
    </div>
  );
}

export default function ResultsPage({
  result,
  config = {},
  inspection,
  preview,
  loading,
  error,
  onRetry,
  onPageChange,
  onDownload,
  onDataset,
  filter = "all",
  onFilterChange,
  elapsedMs,
}) {
  const predictionMap = useMemo(() => {
    const records = result?.predictions ?? (result?.prediction ?? []).map((prediction, index) => ({ row_index: result.row_indices?.[index], prediction }));
    return new Map(records.filter((record) => Number.isInteger(record.row_index)).map((record) => [record.row_index, record]));
  }, [result]);

  if (!result) return (
    <section className="results-empty wb-panel flex min-h-[55vh] flex-col items-center justify-center rounded-2xl border border-white bg-white/65 px-6 py-12 text-center" aria-labelledby="results-heading">
      <span className="flex size-16 items-center justify-center rounded-2xl border border-white bg-gradient-to-br from-white to-blue-50 text-blue-500 shadow-[0_8px_28px_#3b66ac0d]"><Icon name="chart" size={28} /></span>
      <h1 id="results-heading" tabIndex={-1} data-page-heading className="mt-6 text-xl font-semibold tracking-tight text-slate-900 outline-none">Your predictions will appear here</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Choose a target in your dataset and run prediction or evaluation to explore the results.</p>
      <Button onClick={onDataset} className="mt-6"><Icon name="arrowLeft" size={15} />Go to Dataset</Button>
    </section>
  );

  const evaluation = result.mode === "evaluation";
  const preprocessing = result.preprocessing ?? {};
  const metrics = Object.entries(result.metrics ?? {}).filter(([name]) => metricDefinitions[name]);
  const warnings = preprocessing.warnings ?? [];
  const conversions = preprocessing.columns_converted ?? [];
  const exclusions = preprocessing.columns_excluded ?? [];
  const totalRows = inspection?.rows ?? preprocessing.original_shape?.rows ?? preview?.total_rows;
  const measuredTime = typeof elapsedMs === "number" && Number.isFinite(elapsedMs) && elapsedMs >= 0;
  const summary = [
    { label: evaluation ? "Rows evaluated" : "Predictions generated", value: number(predictionMap.size), icon: "sparkles", primary: true },
    { label: "Labeled context rows", value: number(preprocessing.context_rows), icon: "rows" },
    { label: "Prepared features", value: number(preprocessing.final_shape?.columns), icon: "layers" },
    ...(measuredTime ? [{ label: "Elapsed time", value: elapsed(elapsedMs), icon: "clock" }] : []),
  ];
  // The run response determines result semantics; configuration remains the source
  // of the selected target and feature roles for the original dataset display.
  const resultConfig = { ...config, mode: result.mode, taskType: result.task_type };

  return (
    <div className="results-page min-w-0 space-y-4">
      <div className="results-heading flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 id="results-heading" tabIndex={-1} data-page-heading className="text-2xl font-semibold tracking-tight text-slate-900 outline-none">{evaluation ? "Evaluation results" : "Prediction results"}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700"><Icon name="check" size={12} />Complete</span>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">
            Target: <span className="font-medium text-slate-700">{config.targetColumn || "Selected target"}</span>
            <span className="mx-2" aria-hidden="true">·</span>{result.task_type === "regression" ? "Regression" : "Classification"}
            <span className="mx-2" aria-hidden="true">·</span>{evaluation ? "80/20 held-out evaluation" : "Predictions aligned with your original rows"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onDataset}><Icon name="settings" size={15} />Edit configuration</Button>
          <Button onClick={onDownload} disabled={!result.download}><Icon name="download" size={15} />Download CSV</Button>
        </div>
      </div>

      <div className={`results-summary grid gap-3 ${measuredTime ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3"}`}>
        {summary.map((item) => (
          <div key={item.label} className="wb-panel flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white bg-white/75 px-4 py-3.5">
            <div><p className="text-[11px] font-medium text-slate-500">{item.label}</p><p className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${item.primary ? "text-blue-600" : "text-slate-900"}`}>{item.value}</p></div>
            <span className={`rounded-xl p-2 ${item.primary ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-500"}`}><Icon name={item.icon} size={17} /></span>
          </div>
        ))}
      </div>

      {evaluation && metrics.length > 0 && (
        <section aria-label="Evaluation metrics" className={`results-metrics grid gap-3 ${metrics.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {metrics.map(([name, value]) => <Metric key={name} name={name} value={value} />)}
        </section>
      )}

      <section className="wb-panel results-table min-w-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90" aria-labelledby="results-table-title">
        <div className="results-table-toolbar flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3.5">
          <div>
            <h2 id="results-table-title" className="text-sm font-semibold text-slate-800">{evaluation ? "Actual vs. predicted" : "Your completed dataset"}</h2>
            <p className="mt-1 text-[11px] text-slate-500">Original values stay intact. Predictions appear beside the target.</p>
          </div>
          <div className="wb-segmented inline-flex rounded-xl border border-slate-200/80 bg-slate-50/90 p-1" role="group" aria-label="Filter result rows">
            {[
              { value: "all", label: "All rows", count: totalRows },
              { value: "predicted", label: evaluation ? "Held-out rows" : "Predicted rows", count: predictionMap.size },
            ].map((option) => (
              <button key={option.value} type="button" aria-pressed={filter === option.value} disabled={loading || !onFilterChange} onClick={() => onFilterChange(option.value)} className={`results-filter-button flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-60 ${filter === option.value ? "is-active border border-slate-200/60 bg-white text-blue-700 shadow-sm" : "border border-transparent text-slate-500 hover:text-slate-800"}`}>
                {option.label}<span className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${filter === option.value ? "bg-blue-50 text-blue-600" : "bg-slate-200/50 text-slate-500"}`}>{number(option.count)}</span>
              </button>
            ))}
          </div>
        </div>
        <DatasetTable preview={preview} columnDetails={inspection?.column_details ?? []} config={resultConfig} loading={loading} error={error} onRetry={onRetry} onPageChange={onPageChange} predictionMap={predictionMap} predictionColumn={result.prediction_column || "Prediction"} showPrediction />
        <div className="flex items-start gap-2 border-t border-slate-200/80 bg-blue-50/30 px-4 py-3 text-[11px] leading-5 text-slate-500">
          <Icon name="info" size={14} className="mt-0.5 text-blue-500" />
          <p>CSV downloads include every original row and a separate prediction column{result.completed_target_column ? <>. The <code className="break-all font-medium text-slate-700">{result.completed_target_column}</code> column combines known and predicted targets</> : ""}. Rows without a prediction keep an empty prediction cell.</p>
        </div>
      </section>

      <details className="results-preparation wb-panel rounded-xl border border-white bg-white/65 px-4 py-3.5">
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-md text-xs font-medium text-slate-700">
          <span className="flex items-center gap-2"><Icon name="layers" size={15} className="text-slate-500" />Data preparation<span className="text-[10px] font-normal text-slate-500">{conversions.length} converted · {exclusions.length} excluded</span></span>
          <span className="flex items-center gap-2">{warnings.length > 0 && <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-800">{warnings.length} {warnings.length === 1 ? "warning" : "warnings"}</span>}<Icon name="chevronDown" size={14} /></span>
        </summary>
        <div className="mt-4 space-y-4 border-t border-slate-200/70 pt-4">
          <p className="text-xs leading-5 text-slate-500">The same feature preparation was applied to labeled context and prediction rows. The target was excluded from input features.</p>
          <WarningPanel warnings={warnings} title="Review before using these results" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div><h3 className="text-xs font-semibold text-slate-700">Excluded columns</h3><p className="mt-1.5 break-words text-xs leading-5 text-slate-500">{exclusions.length ? exclusions.join(", ") : "No input columns were excluded."}</p></div>
            <div><h3 className="text-xs font-semibold text-slate-700">Feature conversions</h3>{conversions.length ? <ul className="mt-1.5 space-y-1.5 text-xs text-slate-500">{conversions.map((conversion) => <li key={conversion.column}><span className="break-all font-medium text-slate-600">{conversion.column}</span>: {conversion.from_type} → {conversion.to_type}{conversion.output_columns?.length > 1 && <span className="mt-1 block break-words text-[11px]">Prepared as {conversion.output_columns.join(", ")}</span>}</li>)}</ul> : <p className="mt-1.5 text-xs text-slate-500">No type conversions were needed.</p>}</div>
          </div>
        </div>
      </details>
    </div>
  );
}
