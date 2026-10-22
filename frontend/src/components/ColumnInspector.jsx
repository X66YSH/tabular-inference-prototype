import { useEffect, useId, useRef, useState } from "react";
import { Button, Icon } from "./ui";

const TYPE_LABELS = { numeric: "Numeric", categorical: "Categorical", date: "Date" };
const DRAWER_QUERY = "(max-width: 1023px)";

function readableNote(note, name) {
  const prefix = `Column '${name}' `;
  const message = note.startsWith(prefix) ? note.slice(prefix.length) : note;
  const readable = message
    .replace("No observed context values", "No values available")
    .replace("contains non-scalar values", "contains lists or other nested values")
    .replace("review non-finite values", "check for infinite or invalid numbers")
    .replace("review for target leakage", "check whether it reveals the answer")
    .replace("Name checks cannot detect all leakage.", "Also check what this column represents.")
    .replace("use ISO dates and a date override", "use YYYY-MM-DD dates and choose the Date type")
    .replace("Date-like name", "The column name suggests dates");
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

export default function ColumnInspector({
  column,
  config,
  busy = false,
  onClose,
  onTarget,
  onToggle,
  onType,
}) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const headingId = useId();
  const typeId = useId();
  const [drawer, setDrawer] = useState(() => window.matchMedia(DRAWER_QUERY).matches);
  const columnName = column?.name;

  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const query = window.matchMedia(DRAWER_QUERY);
    const update = () => setDrawer(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!drawer || !columnName) return;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector("button")?.focus({ preventScroll: true });

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(panelRef.current?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
      ) ?? []).filter((element) => element.getClientRects().length);
      const first = elements[0];
      const last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (!panelRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [drawer, columnName]);

  if (!column) return null;
  const target = config.targetColumn === column.name;
  const excluded = config.excludedColumns.includes(column.name);
  const override = Object.hasOwn(config.featureTypes, column.name) ? config.featureTypes[column.name] : "";
  const detected = TYPE_LABELS[column.detected_type] ?? "Automatic";
  const applied = TYPE_LABELS[override] ?? detected;
  const warnings = target ? [] : [...new Set(column.warnings ?? [])];
  const suggestions = target ? [] : [...new Set(column.suggestions ?? [])];

  return (
    <div className="wb-inspector-shell">
      {drawer && <button type="button" className="wb-inspector-backdrop" tabIndex={-1} aria-hidden="true" onClick={onClose} />}
      <aside
        ref={panelRef}
        className="wb-inspector"
        role={drawer ? "dialog" : undefined}
        aria-modal={drawer ? true : undefined}
        aria-labelledby={headingId}
      >
        <div className="wb-inspector-header flex items-start justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Column inspector</p>
            <h2 id={headingId} className="mt-1.5 break-all text-base font-semibold text-slate-800">{column.name}</h2>
          </div>
          <button type="button" aria-label="Close column inspector" onClick={onClose} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Icon name="close" size={17} /></button>
        </div>

        <div className="wb-inspector-body space-y-5 p-5">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${target ? "border-blue-200/70 bg-blue-50 text-blue-700" : excluded ? "border-slate-200 bg-slate-100 text-slate-500" : "border-emerald-100 bg-emerald-50/70 text-emerald-700"}`}>
            <Icon name={target ? "sparkles" : excluded ? "close" : "check"} size={12} />
            {target ? "Target column" : excluded ? "Excluded from inference" : "Input feature"}
          </span>

          <dl className="grid grid-cols-2 gap-3">
            {[["Detected type", detected], ["Applied type", target ? "Target" : excluded ? "Not used" : applied], ["Missing values", column.missing_values?.toLocaleString() ?? "—"], ["Unique values", column.unique_values?.toLocaleString() ?? "—"]].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl border border-slate-200/60 bg-white/60 px-3 py-3">
                <dt className="text-[10px] text-slate-500">{label}</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-700">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="space-y-4 border-t border-slate-200/70 pt-5">
            <div>
              <p className="text-xs font-semibold text-slate-700">Column role</p>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">Choose the outcome to predict, or use this column to help make predictions.</p>
              <Button variant="secondary" className="mt-3 w-full" disabled={busy || target} onClick={() => onTarget(column.name)} aria-label={`Set ${column.name} as target`}><Icon name="sparkles" size={14} />{target ? "Selected target" : "Set as target"}</Button>
            </div>

            <label className={`flex items-start gap-2.5 rounded-xl border border-slate-200/70 bg-white/40 p-3 ${target ? "opacity-60" : ""}`}>
              <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-blue-600" checked={!target && !excluded} disabled={busy || target} aria-label={`Include ${column.name}`} onChange={() => onToggle(column.name)} />
              <span><span className="block text-xs font-medium text-slate-700">Include as input feature</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">Excluded columns remain in your dataset and download.</span></span>
            </label>

            <div>
              <label htmlFor={typeId} className="field-label">Use feature as</label>
              <select id={typeId} aria-label={`Feature type for ${column.name}`} className="select-input mt-2" value={override} disabled={busy || target || excluded} onChange={(event) => onType(column.name, event.target.value)}>
                <option value="">Automatic ({detected})</option>
                <option value="numeric">Numeric</option>
                <option value="categorical">Categorical</option>
                <option value="date">Date</option>
              </select>
              <p className="mt-2 text-[11px] leading-4 text-slate-500">{target ? "Feature type settings do not apply to the target." : "Automatic uses the detected type. The same choice applies to all rows."}</p>
            </div>
          </div>

          {target && <p className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-5 text-blue-800"><Icon name="shield" size={15} className="mt-0.5" /><span>The target is never used as an input feature. {config.mode === "prediction" ? "Its missing values identify the rows to predict." : "Evaluation compares held-out predictions with known target values."}</span></p>}

          {(warnings.length > 0 || suggestions.length > 0) && <div className="border-t border-slate-200/70 pt-4">
            <h3 className="text-xs font-semibold text-slate-700">Things to review</h3>
            {warnings.map((warning) => <p key={warning} className="mt-3 flex items-start gap-2 text-xs leading-5 text-amber-800"><Icon name="info" size={14} className="mt-0.5" /><span>{readableNote(warning, column.name)}</span></p>)}
            {suggestions.map((suggestion) => <p key={suggestion} className="mt-3 text-[11px] leading-5 text-slate-500">{readableNote(suggestion, column.name)}</p>)}
          </div>}
        </div>
      </aside>
    </div>
  );
}
