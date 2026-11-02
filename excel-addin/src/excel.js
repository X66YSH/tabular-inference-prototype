export async function readExcelData() {
    return await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getActiveWorksheet();
        const range = sheet.getUsedRange(true);
        
        sheet.load("id");
        range.load(["values", "rowIndex", "columnIndex"]);
        
        await context.sync();

        return {
            values: range.values,
            sheetId: sheet.id,
            rowIndex: range.rowIndex,
            columnIndex: range.columnIndex
        }
    });
}


export async function previewPredictions(
    predictions,
    targetColumn,
    datasetLocation,
    value
) {
    return await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(
            datasetLocation.sheetId
        );

        const targetIndex = value[0].indexOf(targetColumn);

        if (targetIndex === -1) {
            throw new Error("Target column not found.");
        }

        // Read the original dataset again.
        const source = sheet.getRangeByIndexes(
            datasetLocation.rowIndex,
            datasetLocation.columnIndex,
            value.length,
            value[0].length
        );

        source.load("values");
        await context.sync();

        if (JSON.stringify(source.values) !== JSON.stringify(value)) {
            throw new Error("Excel data has changed. Please read it again.");
        }

        const cells = [];
        const seen = new Set();

        for (const record of predictions) {
            const row = record.row_index;


            seen.add(row);

            const cell = sheet.getRangeByIndexes(
                datasetLocation.rowIndex + row + 1,
                datasetLocation.columnIndex + targetIndex,
                1,
                1
            );
            
            cell.load(["rowIndex", "columnIndex"])
            cell.format.font.load("color");
            cells.push({ cell, prediction: record.prediction });
        }

        await context.sync();

        const snapshot = [];

        for (const { cell, prediction } of cells) {
            snapshot.push({
                rowIndex: cell.rowIndex,
                columnIndex: cell.columnIndex,
                originalColor: cell.format.font.color,
                prediction
            });

            cell.values = [[prediction]];
            cell.format.font.color = "#888888";
        }

        await context.sync();

        return {
            sheetId: datasetLocation.sheetId,
            cells: snapshot
        };
    });
}




export async function discardPredictions(snapshot) {
    if (!snapshot || !snapshot.cells?.length) {
        throw new Error("No preview to discard.");
    }

    await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(
            snapshot.sheetId
        );

        const cells = snapshot.cells.map(item => {
            const cell = sheet.getRangeByIndexes(
                item.rowIndex,
                item.columnIndex,
                1,
                1
            );

            cell.load("values");

            return { cell, item };
        });

        await context.sync();

        // Check that preview values have not been edited.
        for (const { cell, item } of cells) {
            if (cell.values[0][0] !== item.prediction) {
                throw new Error(
                    "Preview data has changed. Cannot safely discard."
                );
            }
        }

        // Restore empty cells and original font colors.
        for (const { cell, item } of cells) {
            cell.values = [[""]];
            cell.format.font.color = item.originalColor;
        }

        await context.sync();
    });
}



export async function acceptPredictions(snapshot) {
    if (!snapshot || !snapshot.cells?.length) {
        throw new Error("No preview to accept.");
    }

    await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(
            snapshot.sheetId
        );

        const cells = snapshot.cells.map(item => {
            const cell = sheet.getRangeByIndexes(
                item.rowIndex,
                item.columnIndex,
                1,
                1
            );

            cell.load("values");

            return { cell, item };
        });

        await context.sync();

        // Make sure no preview values were changed.
        for (const { cell, item } of cells) {
            if (cell.values[0][0] !== item.prediction) {
                throw new Error(
                    "Preview data has changed. Cannot safely accept."
                );
            }
        }

        // Confirm predictions by restoring original font colors.
        for (const { cell, item } of cells) {
            cell.format.font.color = item.originalColor || "";
        }

        await context.sync();
    });
}
