// World-space geometry shared by rendering, camera framing and cursor targets.
// "World" is the 1920×1080 stage before the camera transform is applied.

export const STAGE = {w: 1920, h: 1080};

// Excel window on the stage.
export const WIN = {x: 60, y: 40, w: 1800, h: 900};

// Vertical stack of the Excel chrome, relative to the window.
export const CHROME = {
	title: 40,
	tabs: 34,
	ribbon: 64,
	formula: 36,
	gridTop: 178,
	colHeader: 26,
	rowsTop: 204,
	rowsBottom: 840,
	sheetTabs: 30,
	status: 30,
};

export const ROW_H = 30;
export const ROW_HEADER_W = 46;

// Widths of columns A..I (data) followed by spill-over columns J..N.
export const COL_WIDTHS = [132, 150, 168, 118, 150, 172, 116, 196, 104, 100, 100, 100, 100, 100];
export const COL_LETTERS = 'ABCDEFGHIJKLMN'.split('');

export const colLeft = (i: number) => ROW_HEADER_W + COL_WIDTHS.slice(0, i).reduce((a, b) => a + b, 0);

// Window-relative top of a 1-based sheet row.
export const rowTop = (sheetRow: number) => CHROME.rowsTop + (sheetRow - 1) * ROW_H;

// World rect for a data cell (dataRow is 0-based, below the header row).
export const cellWorld = (dataRow: number, col: number) => ({
	x: WIN.x + colLeft(col),
	y: WIN.y + rowTop(dataRow + 2),
	w: COL_WIDTHS[col],
	h: ROW_H,
});

// Task pane, docked right inside the window.
export const PANE = {x: 1370, y: 138, w: 430, header: 38, bottom: 870};
export const PANE_CONTENT_H = PANE.bottom - PANE.y - PANE.header; // 694

// The add-in's own CSS is authored for a ~360px task pane; it is rendered at
// that native size and scaled by K so it reads on a presentation screen.
export const K = 1.15;
export const PANE_NATIVE_W = PANE.w / K;
export const PANE_NATIVE_VIEW_H = PANE_CONTENT_H / K;
export const CONTENT_X = 24;
export const CONTENT_W = PANE_NATIVE_W - 48;

const PANE_ORIGIN_X = WIN.x + PANE.x;
const PANE_ORIGIN_Y = WIN.y + PANE.y + PANE.header;

export const paneToWorld = (nx: number, ny: number, scroll: number) => ({
	x: PANE_ORIGIN_X + nx * K,
	y: PANE_ORIGIN_Y + (ny - scroll) * K,
});

export const worldToPane = (wx: number, wy: number, scroll: number) => ({
	x: (wx - PANE_ORIGIN_X) / K,
	y: (wy - PANE_ORIGIN_Y) / K + scroll,
});

export type Rect = {x: number; y: number; w: number; h: number};

// Native (unscaled) layout of the add-in, mirroring App.css spacing.
// listH and acceptT are animated so the pane can grow smoothly.
export const OPTION_H = 26;
export const ITEM_H = 28;

export function paneLayout(listH: number, acceptT: number) {
	const field = (labelY: number) => ({
		label: labelY,
		select: {x: CONTENT_X, y: labelY + 19, w: CONTENT_W, h: 32} as Rect,
	});
	const target = field(144);
	const mode = field(207);
	const task = field(270);
	const excludedLabel = 333;
	const list: Rect = {x: CONTENT_X, y: 352, w: CONTENT_W, h: listH};
	const send: Rect = {x: CONTENT_X, y: list.y + listH + 16, w: CONTENT_W, h: 34};
	const status: Rect = {x: CONTENT_X, y: send.y + send.h + 10, w: CONTENT_W, h: 50};
	const preview: Rect = {x: CONTENT_X, y: status.y + status.h + 10, w: CONTENT_W, h: 32};
	const half = (CONTENT_W - 8) / 2;
	const accept: Rect = {x: CONTENT_X, y: preview.y + preview.h + 8, w: half, h: 32};
	const discard: Rect = {x: CONTENT_X + half + 8, y: accept.y, w: half, h: 32};
	const glassBottom = preview.y + preview.h + 40 * acceptT + 16;
	return {
		title: 32,
		subtitle: 59,
		read: {x: CONTENT_X, y: 100, w: CONTENT_W, h: 32} as Rect,
		target,
		mode,
		task,
		excludedLabel,
		list,
		send,
		status,
		preview,
		accept,
		discard,
		glassBottom,
		contentH: glassBottom + 14,
	};
}

export type PaneLayout = ReturnType<typeof paneLayout>;

// Native rect of the n-th option in a select's popup menu.
export const menuOption = (select: Rect, i: number): Rect => ({
	x: select.x,
	y: select.y + select.h + 3 + 4 + i * OPTION_H,
	w: select.w,
	h: OPTION_H,
});

export const listItem = (list: Rect, i: number): Rect => ({
	x: list.x + 4,
	y: list.y + 4 + i * ITEM_H,
	w: list.w - 8,
	h: ITEM_H,
});

export const center = (r: Rect) => ({x: r.x + r.w / 2, y: r.y + r.h / 2});
