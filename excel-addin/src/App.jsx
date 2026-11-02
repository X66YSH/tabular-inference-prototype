import { useState } from "react";
import "./App.css";
import {
    readExcelData,
    previewPredictions,
    acceptPredictions,
    discardPredictions
} from "./excel";

function App() {
    const [value, setValue] = useState("");
    const [message, setMessage] = useState("");
    const [targetColumn, setTargetColumn] = useState("");
    const [mode, setMode] = useState("prediction");
    const [taskType, setTaskType] = useState("classification");
    const columns = Array.isArray(value) && value.length > 0 ? value[0] : [];
    const [predictions, setPredictions] = useState(null);
    const [predictionTarget, setPredictionTarget] = useState("");
    const [excludedColumns, setExcludedColumns] = useState([]);
    const [datasetLocation, setDatasetlocation] = useState(null);
    const [previewSnapshot, setPreviewSnapshot] = useState(null);


    
    async function handleReadExcelData() {
        setMessage("Reading Excel data...");

        try {
            const data = await readExcelData();

            setValue(data.values);
            setDatasetlocation({
                sheetId: data.sheetId,
                rowIndex: data.rowIndex,
                columnIndex: data.columnIndex
            });

            setTargetColumn("");
            setExcludedColumns([]);
            setPredictions(null);
            setPredictionTarget("");

            setMessage("Excel data loaded successfully!");

        } catch (error) {
            setMessage(`Excel Error: ${error.message}`);
        }
    }


    async function sendDataToBackend() {
        setMessage("Sending data to backend...");
        console.log("Sending data to backend:", value, targetColumn, mode, taskType);

        setPredictions(null);
        setPredictionTarget("");

        if (!Array.isArray(value) || value.length < 2) {
            setMessage("Please read the Excel data first.");
            return;
        }

        const csv = value.map(row => row.map(cell => 
            `"${String(cell ?? "").replace(/"/g, '""')}"`
            ).join(",")).join("\n");

        const formData = new FormData();
        formData.append("file", new Blob([csv], { type: "text/csv" }), "excel-data.csv");

        if (!targetColumn || !columns.includes(targetColumn)) {
            setMessage("Please select a valid target column.");
            return;
        }

        formData.append("target_column", targetColumn);
        formData.append("mode", mode);
        formData.append("task_type", taskType);
        excludedColumns.forEach(col => formData.append("excluded_columns", col));

        const response = await fetch("/api/predict", {
            method: "POST",
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            const errorMessage = typeof result.detail == "string" ? result.detail : "Prediction failed.";
            setMessage(errorMessage);
            return;
        }

        if (!result.predictions || !Array.isArray(result.predictions)) {
            setMessage("Invalid response from backend.");
            return;
        }
        
        setPredictions(result.predictions);
        setPredictionTarget(targetColumn);
        setMessage(`TabICL predicted ${result.predictions.length} rows.`);
    }


    async function handlePreview() {
        if (!predictions || !datasetLocation || !predictionTarget) {
            setMessage("Please run prediction first.");
            return;
        }

        if (mode !== "prediction" || targetColumn !== predictionTarget) {
            setMessage("Please use the original prediction configuration.");
            return;
        }

        if (previewSnapshot) {
            setMessage("A preview is already active.");
            return;
        }

        try {
            const snapshot = await previewPredictions(
                predictions,
                predictionTarget,
                datasetLocation,
                value
            );

            setPreviewSnapshot(snapshot);
            setMessage("Preview created in Excel. Changes are not yet accepted.");

        } catch (error) {
            setMessage(`Preview failed: ${error.message}`);
        }
    }


    async function handleAccept() {
        if (!previewSnapshot) return;

        try {
            await acceptPredictions(previewSnapshot);

            setPreviewSnapshot(null);
            setPredictions(null);
            setMessage("Predictions accepted!");

        } catch (error) {
            setMessage(`Accept failed: ${error.message}`);
        }
    }

    async function handleDiscard() {
        if (!previewSnapshot) return;

        try {
            await discardPredictions(previewSnapshot);

            setPreviewSnapshot(null);
            setPredictions(null);
            setMessage("Preview discarded!");

        } catch (error) {
            setMessage(`Discard failed: ${error.message}`);
        }
    }



    return(
        <div className="app">
            <div className="glass">
            <h1>Tabular AI</h1>
            <p>Excel Add-in powered by TabICLv2</p>

            <button
                onClick={handleReadExcelData}
                disabled={!!previewSnapshot}
            >
                Read Excel Data
            </button>

            <div>
                <label>Target Column</label>
                <select value={targetColumn} 
                    onChange={(e) => setTargetColumn(e.target.value)}
                    disabled={!!previewSnapshot}
                >
                    <option value="">Select Target Column</option>
                    {columns.map((col, index) => (
                        <option key={index} value={col}>{col}</option>
                    ))}
                </select>
                
            </div>

            <div>
                <label>Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)} disabled={!!previewSnapshot}>
                    <option value="prediction">Prediction</option>
                    <option value="evaluation">Evaluation</option>
                </select>
            </div>

            <div>
                <label>Task Type</label>
                <select value={taskType} onChange={(e) => setTaskType(e.target.value)} disabled={!!previewSnapshot}>
                    <option value="classification">Classification</option>
                    <option value="regression">Regression</option>
                </select>
            </div>

            
            
            <div>
                <label>Excluded Columns</label>

                <div className="exclude-options">
                    {columns
                        .filter(col => col !== targetColumn)
                        .map(col => (
                            <label key={col} className="exclude-option">
                                <input
                                    type="checkbox"
                                    disabled={!!previewSnapshot}
                                    checked={excludedColumns.includes(col)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setExcludedColumns([...excludedColumns, col]);
                                        } else {
                                            setExcludedColumns(
                                                excludedColumns.filter(c => c !== col)
                                            );
                                        }
                                    }}
                                />
                                {col}
                            </label>
                        ))}
                </div>
            </div>



            <button
                onClick={sendDataToBackend}
                disabled={!!previewSnapshot}
            >
                Send Data to Backend
            </button>

            <p>Message from Backend: {message}</p>

            <button onClick={handlePreview} disabled={!predictions || !!previewSnapshot || mode !== "prediction"}>
                    Preview in Excel
            </button>

            {previewSnapshot && (
                <div>
                    <button onClick={handleAccept}>
                        Accept
                    </button>

                    <button onClick={handleDiscard}>
                        Discard
                    </button>
                </div>
            )}

            {/* <p>Value from Excel: {JSON.stringify(value)}</p> */}
        </div>
        </div>
    );
 }   

export default App;