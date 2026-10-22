import { useRef, useState } from "react";
import { Button, ErrorPanel, Icon, Spinner } from "./ui";

export default function UploadWorkspace({ busy = false, error, onSelect, onRetry, onSample }) {
  const inputRef = useRef(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const message = typeof error === "string" ? error : error?.message;

  function drop(event) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (!busy) onSelect(Array.from(event.dataTransfer.files));
  }

  return (
    <section className="wb-upload-workspace" aria-labelledby="upload-workspace-title" aria-busy={busy}>
      <div className="mx-auto max-w-xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/60 px-3 py-1 text-[10px] font-medium text-blue-600"><Icon name="table" size={12} />Your data workspace</span>
        <h1 id="upload-workspace-title" className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Explore your data. Predict what is missing.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">Upload a table, choose your target, and turn the examples you already have into useful predictions.</p>
      </div>

      <div
        className={`wb-upload-dropzone ${dragging && !busy ? "is-dragging" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); dragDepth.current += 1; if (!busy) setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = busy ? "none" : "copy"; }}
        onDragLeave={(event) => { event.preventDefault(); dragDepth.current -= 1; if (dragDepth.current <= 0) setDragging(false); }}
        onDrop={drop}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx" tabIndex={-1} className="sr-only" aria-label="Dataset (CSV or XLSX)" disabled={busy} onChange={(event) => { onSelect(Array.from(event.target.files ?? [])); event.target.value = ""; }} />

        <div className="relative mb-5 h-[78px] w-[88px]" aria-hidden="true">
          <span className="absolute left-1 top-1 h-[65px] w-[54px] -rotate-12 rounded-xl border border-white bg-blue-100/80 shadow-sm" />
          <span className="absolute left-6 top-1 flex h-[67px] w-[54px] rotate-6 items-center justify-center rounded-xl border border-white bg-gradient-to-br from-white to-blue-50 text-blue-400 shadow-[0_6px_18px_#5e85c31a]"><Icon name="table" size={29} /></span>
          <span className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-lg border border-white bg-blue-500 text-white shadow-md"><Icon name="upload" size={14} /></span>
        </div>

        {busy ? <>
          <p role="status" className="flex items-center gap-2 text-sm font-semibold text-blue-700"><Spinner />Inspecting your dataset…</p>
          <p className="mt-2 text-xs text-slate-500">Preparing your table and column details.</p>
        </> : <>
          <h2 className="text-base font-semibold text-slate-800">{dragging ? "Release to open your dataset" : "Drop your dataset here"}</h2>
          <p className="mt-2 text-xs text-slate-500">CSV or Excel · your original data stays intact</p>
        </>}
        <Button variant="secondary" className="mt-5" onClick={() => inputRef.current?.click()} disabled={busy}><Icon name="upload" size={15} />Browse files</Button>
        <p className="mt-3 text-[10px] font-medium tracking-wide text-slate-400">.CSV &nbsp; / &nbsp; .XLSX</p>
      </div>

      {message && <div className="mx-auto mt-4 max-w-xl"><ErrorPanel message={message} onRetry={typeof error === "string" || error?.retryable ? onRetry : undefined} retryLabel="Retry inspection" disabled={busy} /></div>}

      <div className="mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-white/50 px-4 py-3">
        <div className="min-w-0"><p className="text-xs font-medium text-slate-700">Take a look around first</p><p className="mt-1 text-[11px] text-slate-500">A synthetic renewal dataset, ready to explore.</p></div>
        <Button variant="ghost" onClick={onSample} disabled={busy}>Try Sample Dataset<Icon name="arrowRight" size={14} /></Button>
      </div>
      <p className="mx-auto mt-5 flex max-w-xl items-center justify-center gap-2 text-center text-[11px] leading-5 text-slate-500"><Icon name="shield" size={13} />Processed in your application environment. No external AI services.</p>
    </section>
  );
}
