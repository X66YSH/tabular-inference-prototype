import { useEffect, useMemo, useRef, useState } from "react";
import DatasetPage from "./components/DatasetPage";
import ResultsPage from "./components/ResultsPage";
import UploadWorkspace from "./components/UploadWorkspace";
import { Icon } from "./components/ui";
import { downloadCsv, inspectDataset, runInference } from "./lib/api";
import { freshConfig, validateConfiguration } from "./lib/configuration";
import { createSampleFile, SAMPLE_TARGET } from "./lib/sampleDataset";
import usePreview from "./lib/usePreview";

export default function App() {
  const [page, setPage] = useState("dataset");
  const [file, setFile] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [config, setConfig] = useState(freshConfig);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(null);
  const [datasetFilter, setDatasetFilter] = useState("all");
  const [datasetOffset, setDatasetOffset] = useState(0);
  const [resultsFilter, setResultsFilter] = useState("predicted");
  const [resultsOffset, setResultsOffset] = useState(0);
  const [outdated, setOutdated] = useState(false);
  const requestActive = useRef(false);
  const replaceInput = useRef(null);
  const sampleUpload = useRef(false);
  const previousPage = useRef(page);
  const busy = Boolean(status);
  const validation = validateConfiguration(inspection, config);
  const resultIndices = useMemo(() => result?.predictions.map((row) => row.row_index), [result]);
  const browsingResults = page === "results" && Boolean(result);
  const previewState = usePreview(inspection ? file : null, inspection, {
    offset: browsingResults ? resultsOffset : datasetOffset,
    rowFilter: browsingResults ? "all" : datasetFilter,
    targetColumn: config.targetColumn,
    rowIndices: browsingResults && resultsFilter === "predicted" ? resultIndices : undefined,
  });

  useEffect(() => {
    if (previousPage.current === page) return;
    previousPage.current = page;
    document.querySelector("[data-page-heading]")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);

  function navigate(nextPage) { setSelectedColumn(null); setPage(nextPage); }
  function invalidate() {
    if (result) setOutdated(true);
    setResult(null); setElapsedMs(null); setError(null); setResultsOffset(0);
  }
  function changeConfig(patch) {
    if (requestActive.current) return;
    if (Object.entries(patch).every(([key, value]) => config[key] === value)) return;
    setConfig((previous) => ({ ...previous, ...patch }));
    invalidate();
  }
  function changeTarget(targetColumn) {
    if (requestActive.current) return;
    setConfig((previous) => {
      const featureTypes = { ...previous.featureTypes };
      delete featureTypes[targetColumn];
      return { ...previous, targetColumn, featureTypes, excludedColumns: previous.excludedColumns.filter((name) => name !== targetColumn) };
    });
    setDatasetFilter("all"); setDatasetOffset(0); invalidate();
  }
  function toggleColumn(name) {
    if (requestActive.current || name === config.targetColumn) return;
    setConfig((previous) => ({ ...previous, excludedColumns: previous.excludedColumns.includes(name) ? previous.excludedColumns.filter((column) => column !== name) : [...previous.excludedColumns, name] }));
    invalidate();
  }
  function changeType(name, type) {
    if (requestActive.current || name === config.targetColumn) return;
    setConfig((previous) => {
      const featureTypes = type ? { ...previous.featureTypes, [name]: type } : { ...previous.featureTypes };
      if (!type) delete featureTypes[name];
      return { ...previous, featureTypes };
    });
    invalidate();
  }

  async function inspectFile(selected, isSample = false) {
    if (requestActive.current) return;
    requestActive.current = true; setStatus("inspect"); setError(null);
    try {
      const nextInspection = await inspectDataset(selected);
      setInspection(nextInspection);
      if (isSample) setConfig({ ...freshConfig(), targetColumn: SAMPLE_TARGET });
    } catch (requestError) {
      setError({ scope: "upload", message: requestError.message, retryable: true });
      setPage("dataset");
    } finally { setStatus(""); requestActive.current = false; }
  }
  function selectFiles(files, isSample = false) {
    if (requestActive.current || !files.length) return;
    if (files.length !== 1) { setError({ scope: "upload", message: "Please choose one dataset at a time.", retryable: false }); setPage("dataset"); return; }
    const selected = files[0];
    sampleUpload.current = isSample;
    setFile(selected); setInspection(null); setConfig(freshConfig()); setSelectedColumn(null);
    setResult(null); setElapsedMs(null); setError(null); setOutdated(false); setPage("dataset");
    setDatasetOffset(0); setDatasetFilter("all"); setResultsOffset(0); setResultsFilter("predicted");
    if (!/\.(csv|xlsx)$/i.test(selected.name)) { setError({ scope: "upload", message: "Choose a CSV or XLSX file. Other file formats are not supported.", retryable: false }); return; }
    if (!selected.size) { setError({ scope: "upload", message: "This file is empty. Choose a dataset with column headers and at least one data row.", retryable: false }); return; }
    inspectFile(selected, isSample);
  }
  async function run() {
    if (requestActive.current || validation || !file) return;
    requestActive.current = true; setStatus("predict"); setError(null); setResult(null); setOutdated(false); setElapsedMs(null);
    setSelectedColumn(null);
    const started = performance.now();
    try {
      const nextResult = await runInference(file, config);
      if (nextResult.predictions.some((row) => row.row_index >= inspection.rows)) throw new Error("The server returned row positions that do not match this dataset. Retry inference.");
      setResult(nextResult); setElapsedMs(performance.now() - started); setResultsFilter("predicted"); setResultsOffset(0); setPage("results");
    } catch (requestError) { setError({ scope: "inference", message: requestError.message }); setPage("dataset"); }
    finally { setStatus(""); requestActive.current = false; }
  }

  return <div className="wb-shell">
    <a href="#workspace-content" className="skip-link">Skip to workspace</a>
    <aside className="wb-sidebar" aria-label="Application navigation">
      <div className="wb-brand"><span className="brand-mark"><Icon name="layers" size={22} /></span><div><strong>Tabular AI</strong><span>DATA WORKBENCH</span></div></div>
      <span className="wb-nav-label">WORKSPACE</span>
      <nav aria-label="Workspace pages">
        <button type="button" aria-label="Dataset" aria-current={page === "dataset" ? "page" : undefined} onClick={() => navigate("dataset")}><Icon name="table" size={18} /><span>Dataset</span>{inspection && <span className="wb-nav-dot" />}</button>
        <button type="button" aria-label="Results" aria-current={page === "results" ? "page" : undefined} onClick={() => navigate("results")}><Icon name="chart" size={18} /><span>Results</span>{result && <span className="wb-nav-count">{result.predictions.length.toLocaleString()}</span>}</button>
      </nav>
      <div className="wb-sidebar-bottom"><div className="wb-model-card"><span className="wb-model-icon"><Icon name="sparkles" size={17} /></span><div><strong>TabICLv2</strong><span>Local foundation model</span></div><span className="wb-status-dot" /></div><p>Powered by TabICLv2</p><span className="wb-prototype-tag">PROTOTYPE WORKSPACE</span></div>
    </aside>

    <div className="wb-main-shell">
      <header className="wb-topbar">
        <div className="wb-breadcrumb"><span>Workspace</span><Icon name="arrowRight" size={12} /><strong>{page === "dataset" ? "Dataset" : "Results"}</strong>{file && <><span className="wb-breadcrumb-divider" /><Icon name="file" size={15} /><span className="wb-filename" title={file.name}>{file.name}</span></>}</div>
        <div className="wb-topbar-actions"><span className="wb-local-badge"><span className="wb-status-dot" />{busy ? status === "inspect" ? "Inspecting" : "Processing" : "Local workspace"}</span>{file && <><input ref={replaceInput} type="file" accept=".csv,.xlsx" className="sr-only" tabIndex={-1} aria-label="Replace dataset file" disabled={busy} onChange={(event) => { selectFiles(Array.from(event.target.files || [])); event.target.value = ""; }} /><button type="button" className="wb-replace-button" disabled={busy} onClick={() => replaceInput.current?.click()}><Icon name="refresh" size={14} /><span>Replace dataset</span></button></>}</div>
      </header>
      <main id="workspace-content" className={`wb-main-content ${!inspection && page === "dataset" ? "is-empty" : ""}`}>
        {page === "dataset" ? inspection ? <>
          <div className="wb-file-meta"><span>{file.name}</span><span>{inspection.rows.toLocaleString()} rows</span><span>{inspection.column_details.length} columns</span><span>{(file.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB</span></div>
          <DatasetPage inspection={inspection} config={config} onChange={changeConfig} onTarget={changeTarget} onToggle={toggleColumn} onType={changeType} selectedColumn={selectedColumn} onSelectColumn={setSelectedColumn} onCloseInspector={() => setSelectedColumn(null)} preview={previewState.preview} previewLoading={previewState.loading} previewError={previewState.error} onPreviewRetry={previewState.retry} onPageChange={setDatasetOffset} filter={datasetFilter} onFilterChange={(value) => { setDatasetFilter(value); setDatasetOffset(0); }} busy={status === "predict"} validation={validation} error={error?.scope === "inference" ? error.message : null} onRun={run} />
        </> : <UploadWorkspace busy={status === "inspect"} error={error?.scope === "upload" ? error : null} onSelect={selectFiles} onRetry={() => inspectFile(file, sampleUpload.current)} onSample={() => selectFiles([createSampleFile()], true)} /> : <>
          {outdated && <div className="wb-outdated-note" role="status"><Icon name="info" size={16} />Your configuration changed. Run inference again to see up-to-date results.</div>}
          {status === "predict" && <div className="wb-outdated-note" role="status">Inference is running. Results will appear here when it finishes.</div>}
          <ResultsPage result={result} config={config} inspection={inspection} preview={previewState.preview} loading={previewState.loading} error={previewState.error} onRetry={previewState.retry} onPageChange={setResultsOffset} onDownload={() => downloadCsv(result?.download)} onDataset={() => navigate("dataset")} filter={resultsFilter} onFilterChange={(value) => { setResultsFilter(value); setResultsOffset(0); }} elapsedMs={elapsedMs} />
        </>}
      </main>
      <footer className="wb-footer"><span><Icon name="shield" size={12} />Your data stays in this application environment.</span><span>Tabular AI · Local inference</span></footer>
    </div>
  </div>;
}
