async function readResponse(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail;
    const message = Array.isArray(detail) ? detail.map((item) => item.msg).join("; ") : detail;
    throw new Error(typeof message === "string" ? message : `The request could not be completed (${response.status}). Please try again.`);
  }
  if (!payload) throw new Error("The server returned an empty response. Please try again.");
  return payload;
}

async function upload(endpoint, file, fields = {}, signal) {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
  let response;
  try {
    response = await fetch(`/api/${endpoint}`, { method: "POST", body: formData, signal });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Unable to connect. Check that the application server is running, then try again.");
  }
  return readResponse(response);
}

const invalidResponse = () => new Error("The server returned an unexpected response. Please retry, or check that the frontend and backend are running the same version.");
const scalar = (value) => value === null || ["string", "number", "boolean"].includes(typeof value);
const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const count = (value) => Number.isSafeInteger(value) && value >= 0;

function validatePreview(preview) {
  if (!preview || !strings(preview.columns) ||
    ![preview.total_rows, preview.filtered_rows, preview.offset, preview.limit].every(Number.isSafeInteger) ||
    preview.total_rows < 0 || preview.filtered_rows < 0 || preview.filtered_rows > preview.total_rows || preview.offset < 0 || preview.limit < 1 ||
    !Array.isArray(preview.rows) || preview.rows.length > preview.limit ||
    !preview.rows.every((row) => record(row) && Number.isSafeInteger(row.row_index) && row.row_index >= 0 && row.row_index < preview.total_rows &&
      Array.isArray(row.values) && row.values.length === preview.columns.length && row.values.every(scalar) &&
      Array.isArray(row.missing) && row.missing.length === preview.columns.length && row.missing.every((value) => typeof value === "boolean"))) throw invalidResponse();
  return preview;
}

export async function inspectDataset(file) {
  const response = await upload("inspect", file);
  if (!count(response.rows) || !strings(response.warnings) || !strings(response.duplicate_columns) || !Array.isArray(response.column_details) ||
    !response.column_details.every((column) => record(column) && typeof column.name === "string" && count(column.missing_values) && column.missing_values <= response.rows && count(column.unique_values) &&
      ["numeric", "categorical", "date"].includes(column.detected_type) && strings(column.warnings) && strings(column.suggestions))) throw invalidResponse();
  validatePreview(response.preview);
  if (response.preview.total_rows !== response.rows || response.preview.columns.length !== response.column_details.length ||
    response.preview.columns.some((name, index) => name !== response.column_details[index].name)) throw invalidResponse();
  return response;
}

export async function previewDataset(file, { offset = 0, rowFilter = "all", targetColumn = "", rowIndices }, signal) {
  return validatePreview(await upload("preview", file, {
    offset, limit: 50, row_filter: rowFilter,
    ...(targetColumn ? { target_column: targetColumn } : {}),
    ...(rowIndices ? { row_indices: JSON.stringify(rowIndices) } : {}),
  }, signal));
}

export async function runInference(file, config) {
  const result = await upload("predict", file, {
  target_column: config.targetColumn,
  mode: config.mode,
  task_type: config.taskType,
  excluded_columns: JSON.stringify(config.excludedColumns),
  feature_types: JSON.stringify(config.featureTypes),
  });
  const preparation = result.preprocessing;
  if (result.mode !== config.mode || result.task_type !== config.taskType || !Array.isArray(result.predictions) ||
    !result.predictions.every((row) => record(row) && count(row.row_index) && row.prediction !== null && scalar(row.prediction) &&
      (config.mode !== "evaluation" || (row.actual !== null && scalar(row.actual)))) ||
    new Set(result.predictions.map((row) => row.row_index)).size !== result.predictions.length ||
    !record(preparation) || !count(preparation.context_rows) || !count(preparation.query_rows) || preparation.query_rows !== result.predictions.length ||
    !count(preparation.final_shape?.columns) || !strings(preparation.warnings) || !strings(preparation.columns_excluded) ||
    !Array.isArray(preparation.columns_converted) || !preparation.columns_converted.every((item) => record(item) && typeof item.column === "string" && typeof item.from_type === "string" && typeof item.to_type === "string" && strings(item.output_columns)) ||
    (result.metrics !== null && (!record(result.metrics) || !Object.values(result.metrics).every((value) => value === null || (typeof value === "number" && Number.isFinite(value))))) ||
    typeof result.prediction_column !== "string" || typeof result.download?.content !== "string" || typeof result.download.filename !== "string") throw invalidResponse();
  return result;
}

export function downloadCsv(download) {
  if (!download) return;
  const url = URL.createObjectURL(new Blob([download.content], { type: `${download.content_type || "text/csv"};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = download.filename || "predictions.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
