// Pure function from frame → everything the workspace shows. Mirrors the
// add-in's real state transitions in excel-addin/src/App.jsx.
import {BLANK_ROWS, COLUMNS, PREDICTION_COUNT, TARGET_COLUMN} from './data/dataset';
import {ITEM_H, PANE_NATIVE_VIEW_H, paneLayout} from './layout';
import {easeOut, prog, pulse, track} from './lib/anim';
import {SCROLL, T} from './timeline';

export type MenuId = 'target' | 'mode' | 'task';

export type PreviewCell = {
	shown: number; // 0..1 provisional value visible
	committed: number; // 0..1 provisional grey → committed ink
	flash: number; // 0..1 brief emphasis as the value lands
};

const VISIBLE_BLANKS = 7; // blanks inside the visible grid area get the slow stagger

function messageAt(f: number): string {
	const timeline: [number, string][] = [
		[T.readClick, 'Reading Excel data...'],
		[T.readDone, 'Excel data loaded successfully!'],
		[T.sendClick, 'Running TabICLv2 inference...'],
		[T.inferDone, `TabICL predicted ${PREDICTION_COUNT} rows.`],
		[T.previewClick + 6, 'Preview created in Excel. Changes are not yet accepted.'],
		[T.discardClick + 4, 'Preview discarded!'],
		[T.rewind[1], 'Preview created in Excel. Changes are not yet accepted.'],
		[T.acceptClick + 4, 'Predictions accepted!'],
	];
	let msg = '';
	for (const [at, text] of timeline) if (f >= at) msg = text;
	return msg;
}

function menuAt(f: number): {id: MenuId | null; t: number} {
	const menus: [MenuId, number, number][] = [
		['target', T.targetOpen, T.targetPick],
		['mode', T.modeOpen, T.modePick],
		['task', T.taskOpen, T.taskPick],
	];
	for (const [id, open, pick] of menus) {
		if (f >= open && f < pick + 7) {
			return {id, t: Math.min(prog(f, open, 6, easeOut), 1 - prog(f, pick + 1, 6))};
		}
	}
	return {id: null, t: 0};
}

export function getState(f: number) {
	const loaded = f >= T.readDone;
	const listReveal = prog(f, T.readDone, 14, easeOut);
	const targetPicked = f >= T.targetPick;
	const targetCollapse = prog(f, T.targetPick + 4, 10);

	// The excluded-columns list drops the target once it is chosen.
	const itemHeights = COLUMNS.map((c) => (c === TARGET_COLUMN ? ITEM_H * (1 - targetCollapse) : ITEM_H));
	const listFull = 8 + itemHeights.reduce((a, b) => a + b, 0);
	const listH = loaded ? listFull * listReveal : 0;

	const inPreview1 = f >= T.previewClick && f < T.discardClick;
	const inPreview2 = f >= T.rewind[1] && f < T.acceptClick;
	const previewActive = inPreview1 || inPreview2;
	const predictionsReady = (f >= T.inferDone && f < T.discardClick) || (f >= T.rewind[1] && f < T.acceptClick);

	let acceptT = 0;
	if (f >= T.rewind[1] && f < T.acceptClick + 12) acceptT = 1 - prog(f, T.acceptClick + 2, 10);
	else if (f >= T.previewClick && f < T.rewind[1]) acceptT = Math.min(prog(f, T.previewClick + 6, 10, easeOut), 1 - prog(f, T.discardClick + 2, 10));

	const layout = paneLayout(listH, acceptT);
	const maxScroll = Math.max(0, layout.contentH - PANE_NATIVE_VIEW_H);
	const wanted = track(f, [
		[T.scroll1[0], 0],
		[T.scroll1[1], SCROLL.s1],
		[T.scroll2[0], SCROLL.s1],
		[T.scroll2[1], SCROLL.s2],
		[T.scroll3[0], SCROLL.s2],
		[T.scroll3[1], SCROLL.s3],
	]);
	const scroll = Math.min(wanted, maxScroll);
	const scrolling =
		Math.max(
			pulse(f, T.scroll1[0] - 4, T.scroll1[1] - T.scroll1[0] + 24),
			pulse(f, T.scroll2[0] - 4, T.scroll2[1] - T.scroll2[0] + 24),
			pulse(f, T.scroll3[0] - 4, T.scroll3[1] - T.scroll3[0] + 24),
		) || 0;

	// Target-cell states, indexed by data row.
	const cells: Record<number, PreviewCell> = {};
	BLANK_ROWS.forEach((row, k) => {
		const appear = T.fillStart + (k < VISIBLE_BLANKS ? k * T.fillStagger : VISIBLE_BLANKS * T.fillStagger);
		let shown = 0;
		let flash = 0;
		let committed = 0;
		if (f >= T.previewClick && f < T.rewind[1]) {
			shown = prog(f, appear, 14, easeOut);
			flash = pulse(f, appear, 30);
			shown *= 1 - prog(f, T.discardClick + 4 + k * 2, 10);
		} else if (f >= T.rewind[1]) {
			shown = 1;
			const commit = T.acceptClick + 4 + k * 3;
			committed = prog(f, commit, 14);
			flash = pulse(f, commit, 26) * 0.8;
		}
		cells[row] = {shown, committed, flash};
	});

	return {
		paneIn: prog(f, T.paneIn, 40, easeOut),
		loaded,
		listH,
		itemHeights,
		targetPicked,
		target: targetPicked ? TARGET_COLUMN : '',
		excluded: f >= T.excludeClick ? ['customer_id'] : ([] as string[]),
		excludeCheckT: prog(f, T.excludeClick, 8, easeOut),
		menu: menuAt(f),
		message: messageAt(f),
		running: f >= T.sendClick && f < T.inferDone,
		messageChangedAt: lastMessageChange(f),
		predictionsReady,
		previewActive,
		acceptT,
		layout,
		scroll,
		scrolling,
		cells,
		// Sheet annotations (purely visual emphasis, not Excel state).
		blankHint: pulse(f, T.blankHint, 64),
		usedRange: Math.min(prog(f, T.readClick + 2, 10), 1 - prog(f, T.readDone + 26, 16)),
		usedRangeSweep: prog(f, T.readClick + 4, T.readDone - T.readClick, (t) => t),
		targetTint: prog(f, T.targetPick, 12) * (1 - prog(f, T.workspaceOut, 16)),
		excludedDim: prog(f, T.excludeClick, 12) * (1 - prog(f, T.previewClick, 20)),
		inferHint: pulse(f, T.inferDone + 4, 56),
		previewBand: Math.max(
			Math.min(prog(f, T.fillStart - 6, 20), 1 - prog(f, T.discardClick + 6, 14)) * (f < T.rewind[1] ? 1 : 0),
			f >= T.rewind[1] ? 1 - prog(f, T.acceptClick + 30, 30) : 0,
		),
	};
}

function lastMessageChange(f: number) {
	const changes = [
		T.readClick,
		T.readDone,
		T.sendClick,
		T.inferDone,
		T.previewClick + 6,
		T.discardClick + 4,
		T.rewind[1],
		T.acceptClick + 4,
	];
	let last = -999;
	for (const c of changes) if (f >= c) last = c;
	return last;
}

export type DemoState = ReturnType<typeof getState>;
