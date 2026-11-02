// Every timing decision lives here. Frames are at 30 fps.
// To retime a scene, shift its event frames together with the matching
// camera, cursor and caption keys below.
import type {CameraKey, CursorKey} from './lib/anim';
import {center, listItem, menuOption, paneLayout, paneToWorld} from './layout';

export const FPS = 30;
export const DURATION = 2190; // 73 s

export const T = {
	// Scene 1 — intro
	introEnd: 162,
	workspaceIn: 124,

	// Step 1 — workbook
	paneIn: 200,
	blankHint: 258,
	cursorIn: 300,

	// Step 2 — read data
	readClick: 386,
	readDone: 446,

	// Step 3 — configure
	targetOpen: 568,
	targetPick: 640,
	modeOpen: 706,
	modePick: 746,
	taskOpen: 806,
	taskPick: 846,

	// Step 4 — exclude
	excludeClick: 926,
	scroll1: [952, 992] as const,

	// Step 5 — inference
	sendClick: 1080,
	inferDone: 1196,
	scroll2: [1222, 1256] as const,

	// Step 6 — preview (the payoff)
	previewClick: 1352,
	fillStart: 1368,
	fillStagger: 8,
	scroll3: [1606, 1644] as const,

	// Step 7 — two alternative outcomes from the same preview
	discardClick: 1784,
	rewind: [1846, 1866, 1886] as const, // blur in, swap state, blur out
	acceptClick: 1928,

	// Closing
	workspaceOut: 2024,
	outroStart: 2040,
};

export const STEP_STARTS = [150, 330, 510, 870, 1020, 1290, 1740, 2030];

export const CLICKS = [
	T.readClick,
	T.targetOpen,
	T.targetPick,
	T.modeOpen,
	T.modePick,
	T.taskOpen,
	T.taskPick,
	T.excludeClick,
	T.sendClick,
	T.previewClick,
	T.discardClick,
	T.acceptClick,
];

export const SCROLL = {s1: 130, s2: 160, s3: 200};

export type Caption = {from: number; to: number; step: number; title: string; sub: string; hero?: boolean};

export const CAPTIONS: Caption[] = [
	{from: 150, to: 330, step: 1, title: 'Open the Excel workbook', sub: 'Synthetic credit data · 12 rows have no default label yet'},
	{from: 330, to: 510, step: 2, title: 'Read the worksheet data', sub: 'One click loads the sheet into the add-in'},
	{from: 510, to: 870, step: 3, title: 'Select target column and task type', sub: 'Familiar Excel controls. No code.'},
	{from: 870, to: 1020, step: 4, title: 'Exclude columns if needed', sub: 'Optional · e.g. identifiers such as customer_id'},
	{from: 1020, to: 1290, step: 5, title: 'Run TabICLv2 inference', sub: 'Predict without task-specific training'},
	{from: 1290, to: 1400, step: 6, title: 'Preview predictions in the original cells', sub: 'Written back into the same worksheet'},
	{
		from: 1400,
		to: 1740,
		step: 6,
		title: 'Predictions appear directly in the original Excel cells.',
		sub: 'No export. No copy and paste.',
		hero: true,
	},
	// Discard and Accept are shown as two alternatives from the same preview:
	// in the add-in, Discard also clears the predictions, so the re-run is not shown.
	{from: 1740, to: 1862, step: 7, title: 'Accept or discard', sub: 'Option A · Discard clears the previewed cells'},
	{from: 1862, to: 1940, step: 7, title: 'Accept or discard', sub: 'Option B · Accept keeps the same predictions'},
	{from: 1940, to: 2030, step: 7, title: 'AI suggests. Employees decide.', sub: 'Accept keeps the values · Discard clears them', hero: true},
];

export const FLOW_CHIP = {from: 1082, to: 1206};

export const CAMERA: CameraKey[] = [
	{f: 124, cx: 960, cy: 520, z: 0.84},
	{f: 215, cx: 960, cy: 500, z: 1.0},
	{f: 332, cx: 960, cy: 500, z: 1.0},
	{f: 378, cx: 1100, cy: 500, z: 1.2},
	{f: 505, cx: 1100, cy: 500, z: 1.2},
	{f: 552, cx: 1300, cy: 520, z: 1.6},
	{f: 862, cx: 1300, cy: 520, z: 1.6},
	{f: 906, cx: 1300, cy: 600, z: 1.6},
	{f: 1016, cx: 1300, cy: 600, z: 1.6},
	{f: 1064, cx: 1150, cy: 540, z: 1.3},
	{f: 1272, cx: 1150, cy: 540, z: 1.3},
	{f: 1326, cx: 1150, cy: 580, z: 1.3},
	{f: 1358, cx: 1150, cy: 580, z: 1.3},
	// Payoff: ease in on the target column (header row kept in view) while the cells fill.
	{f: 1440, cx: 1175, cy: 556, z: 1.5},
	{f: 1600, cx: 1182, cy: 560, z: 1.56},
	// Step 7: header, cells and Accept / Discard all in frame.
	{f: 1690, cx: 1180, cy: 590, z: 1.4},
	{f: 1990, cx: 1180, cy: 590, z: 1.4},
	{f: 2040, cx: 1150, cy: 540, z: 1.2},
	{f: 2075, cx: 960, cy: 520, z: 0.98},
];

// Cursor targets are derived from the pane layout so they always land on
// the rendered controls.
const L = paneLayout(232, 1);
const at = (nx: number, ny: number, scroll: number) => paneToWorld(nx, ny, scroll);
const read = at(150, center(L.read).y, 0);
const targetSel = at(150, center(L.target.select).y, 0);
const targetDefault = at(140, center(menuOption(L.target.select, 9)).y, 0);
const modeSel = at(150, center(L.mode.select).y, 0);
const modePrediction = at(140, center(menuOption(L.mode.select, 0)).y, 0);
const taskSel = at(150, center(L.task.select).y, 0);
const taskClassification = at(140, center(menuOption(L.task.select, 0)).y, 0);
const excludeId = at(60, center(listItem(L.list, 0)).y, 0);
const send = at(150, center(L.send).y, SCROLL.s1);
const preview = at(150, center(L.preview).y, SCROLL.s2);
const discard = at(center(L.discard).x, center(L.discard).y, SCROLL.s3);
const accept = at(center(L.accept).x, center(L.accept).y, SCROLL.s3);

const k = (f: number, p: {x: number; y: number}): CursorKey => ({f, x: p.x, y: p.y});

export const CURSOR: CursorKey[] = [
	k(300, {x: 1180, y: 640}),
	k(336, {x: 1180, y: 640}),
	k(378, read),
	k(396, read),
	k(436, {x: 1716, y: 398}),
	k(515, {x: 1716, y: 398}),
	k(558, targetSel),
	k(578, targetSel),
	k(628, targetDefault),
	k(652, targetDefault),
	k(694, modeSel),
	k(714, modeSel),
	k(736, modePrediction),
	k(756, modePrediction),
	k(796, taskSel),
	k(814, taskSel),
	k(836, taskClassification),
	k(858, taskClassification),
	k(914, excludeId),
	k(1022, excludeId),
	k(1068, send),
	k(1092, send),
	k(1130, {x: 1735, y: 720}),
	k(1292, {x: 1735, y: 720}),
	k(1340, preview),
	k(1362, preview),
	k(1404, {x: 1760, y: 742}),
	k(1742, {x: 1760, y: 742}),
	k(1774, discard),
	k(1846, discard),
	k(1866, {x: 1700, y: 770}),
	k(1890, {x: 1700, y: 770}),
	k(1918, accept),
	k(1946, accept),
	k(1990, {x: 1640, y: 770}),
];
