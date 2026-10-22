export const freshConfig = () => ({ targetColumn: "", mode: "prediction", taskType: "classification", excludedColumns: [], featureTypes: {} });

export function summarize(inspection, config) {
  const target = inspection?.column_details.find((column) => column.name === config.targetColumn);
  const total = inspection?.rows ?? 0;
  const missing = target?.missing_values ?? 0;
  const labeled = target ? total - missing : 0;
  const features = inspection?.column_details.filter((column) => column.name !== config.targetColumn && !config.excludedColumns.includes(column.name)).length ?? 0;
  const evaluation = config.mode === "evaluation";
  return { target, total, missing, labeled, features, context: evaluation ? total - Math.ceil(total * .2) : labeled, query: evaluation ? Math.ceil(total * .2) : missing };
}

export function validateConfiguration(inspection, config) {
  if (!inspection) return "Upload a dataset to get started.";
  if (inspection.duplicate_columns?.length) return "Rename duplicate column headers in your file, then upload it again. Each column needs a unique name.";
  if (inspection.column_details.length < 2) return "Your dataset needs a target column and at least one input feature.";
  const { target, missing, labeled, features } = summarize(inspection, config);
  if (!target) return "Choose the column you want to predict. Use the target selector or click a column header.";
  if (config.mode === "prediction" && missing === 0) return "No missing target values were found. Use Evaluation Mode to test model performance on labeled data.";
  if (config.mode === "prediction" && labeled < 2) return "Add at least two rows with known target values to provide examples for prediction.";
  if (config.mode === "evaluation" && missing > 0) return `Evaluation needs a known target for every row. Switch to Prediction to fill the ${missing.toLocaleString()} missing outcomes.`;
  if (config.mode === "evaluation" && labeled < 3) return "Evaluation needs at least three labeled rows for an 80/20 split.";
  if (config.taskType === "classification" && target.unique_values < 2) return "Classification needs at least two different labeled outcomes. Add examples of another outcome.";
  if (config.taskType === "classification" && target.detected_type === "date") return "Dates cannot be classification labels. Choose a different target column.";
  if (config.taskType === "regression" && target.detected_type !== "numeric") return "Regression needs numerical target values. Choose a numerical target, or use Classification for categories.";
  if (!features) return "Include at least one input feature. Select a column and turn on Include as feature.";
  return "";
}
