// Synthetic demonstration data. Every value is fabricated for this video;
// none of it describes a real company or customer.

export const COLUMNS = [
	'customer_id',
	'industry',
	'region',
	'employees',
	'debt_to_assets',
	'interest_coverage',
	'cash_ratio',
	'revenue_growth_pct',
	'default',
] as const;

export type ColumnName = (typeof COLUMNS)[number];
export type CellValue = string | number | null;

export const TARGET_COLUMN: ColumnName = 'default';
export const TARGET_INDEX = COLUMNS.indexOf(TARGET_COLUMN);

// Columns the scripted user excludes in Step 4 (identifier only).
export const EXCLUDED_IN_DEMO: ColumnName[] = ['customer_id'];

type RawRow = [string, string, string, number, number, number, number, number, 0 | 1 | null];

// prettier-ignore
const RAW: RawRow[] = [
	['C-1001', 'Logistics',     'Quebec',           116,  0.491, 5.34,  0.84, -7.7,  0],
	['C-1002', 'Retail',        'Alberta',          1758, 0.812, 0.94,  0.21, -18.6, null],
	['C-1003', 'Technology',    'Ontario',          424,  0.363, 6.31,  0.71, 12.4,  0],
	['C-1004', 'Retail',        'Prairies',         273,  0.788, 1.12,  0.19, -22.3, 1],
	['C-1005', 'Manufacturing', 'Atlantic',         988,  0.457, 4.75,  0.62, 3.8,   null],
	['C-1006', 'Technology',    'British Columbia', 2869, 0.318, 11.4,  1.06, 24.6,  0],
	['C-1007', 'Construction',  'Ontario',          462,  0.866, 0.71,  0.14, -15.2, 1],
	['C-1008', 'Healthcare',    'Quebec',           233,  0.291, 7.36,  0.89, 9.8,   null],
	['C-1009', 'Retail',        'Prairies',         85,   0.539, 3.42,  0.47, -5.4,  0],
	['C-1010', 'Energy',        'Alberta',          1127, 0.402, 8.62,  0.95, 15.2,  0],
	['C-1011', 'Agriculture',   'Ontario',          839,  0.774, 1.08,  0.23, -12.7, null],
	['C-1012', 'Retail',        'British Columbia', 2249, 0.596, 4.16,  0.57, 1.5,   0],
	['C-1013', 'Logistics',     'Atlantic',         368,  0.732, 1.36,  0.28, -9.1,  1],
	['C-1014', 'Construction',  'Ontario',          1547, 0.511, 5.69,  0.54, 6.3,   null],
	['C-1015', 'Technology',    'Quebec',           322,  0.244, 13.16, 1.12, 31.6,  0],
	['C-1016', 'Manufacturing', 'Alberta',          477,  0.851, 0.82,  0.17, -24,   null],
	['C-1017', 'Retail',        'Atlantic',         771,  0.469, 6.47,  0.63, 2.5,   0],
	['C-1018', 'Energy',        'Prairies',         1254, 0.545, 4.13,  0.71, -6.8,  0],
	['C-1019', 'Agriculture',   'British Columbia', 1497, 0.433, 6.84,  0.75, 8.1,   null],
	['C-1020', 'Retail',        'Prairies',         134,  0.798, 0.98,  0.24, -19.1, 1],
	['C-1021', 'Energy',        'Alberta',          623,  0.579, 3.7,   0.56, 10.8,  0],
	['C-1022', 'Manufacturing', 'Ontario',          879,  0.639, 2.7,   0.41, -3.2,  0],
	['C-1023', 'Retail',        'Quebec',           64,   0.83,  0.88,  0.22, -16.5, null],
	['C-1024', 'Agriculture',   'Prairies',         2843, 0.386, 5.92,  0.81, 11.6,  0],
	['C-1025', 'Construction',  'Alberta',          153,  0.778, 1.34,  0.31, -20.1, 1],
	['C-1026', 'Construction',  'Atlantic',         2060, 0.422, 6.29,  0.73, 6.7,   null],
	['C-1027', 'Energy',        'Atlantic',         2349, 0.574, 5.07,  0.48, -1.7,  0],
	['C-1028', 'Energy',        'Quebec',           2023, 0.298, 9.72,  1.06, 19.1,  0],
	['C-1029', 'Healthcare',    'Alberta',          245,  0.364, 7.77,  0.86, -3.7,  null],
	['C-1030', 'Logistics',     'Ontario',          873,  0.666, 2.34,  0.33, -2.6,  0],
	['C-1031', 'Agriculture',   'British Columbia', 659,  0.53,  4.36,  0.66, 7,     0],
	['C-1032', 'Construction',  'Quebec',           57,   0.82,  0.74,  0.18, -21.1, null],
	['C-1033', 'Healthcare',    'Ontario',          1713, 0.336, 11.64, 0.94, 4.5,   0],
	['C-1034', 'Agriculture',   'Quebec',           1311, 0.759, 1.23,  0.27, -9.7,  1],
	['C-1035', 'Energy',        'Prairies',         222,  0.526, 3.15,  0.51, -4,    null],
	['C-1036', 'Technology',    'Atlantic',         420,  0.257, 8.7,   1,    16.7,  0],
];

export const ROWS: CellValue[][] = RAW;

// Data-row indices (0-based, excluding the header) whose target is blank.
export const BLANK_ROWS: number[] = RAW.flatMap((row, i) => (row[TARGET_INDEX] === null ? [i] : []));

// Scripted values revealed during the preview. They are illustrative only and
// are not output from a live TabICLv2 run.
export const PREDICTIONS: Record<number, 0 | 1> = {
	1: 1,
	4: 0,
	7: 0,
	10: 1,
	13: 0,
	15: 1,
	18: 0,
	22: 1,
	25: 0,
	28: 0,
	31: 1,
	34: 0,
};

export const PREDICTION_COUNT = Object.keys(PREDICTIONS).length;

// Guard the story's invariants: exactly 12 blanks, and a prediction for each
// blank row and nowhere else.
const predictedRows = Object.keys(PREDICTIONS).map(Number).sort((a, b) => a - b);
if (
	BLANK_ROWS.length !== 12 ||
	predictedRows.length !== BLANK_ROWS.length ||
	predictedRows.some((row, i) => row !== BLANK_ROWS[i])
) {
	throw new Error('Demo dataset invariant violated: predictions must cover exactly the 12 blank target cells.');
}

export const formatCell = (value: CellValue): string => (value === null ? '' : String(value));
