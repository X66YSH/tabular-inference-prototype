import React from 'react';
import {BLANK_ROWS, COLUMNS, PREDICTIONS, ROWS, TARGET_INDEX, formatCell} from '../data/dataset';
import {CHROME, COL_LETTERS, COL_WIDTHS, ROW_H, ROW_HEADER_W, WIN, colLeft, rowTop} from '../layout';
import {mixHex} from '../lib/anim';
import type {DemoState} from '../state';
import {C} from '../styles/theme';

const VISIBLE_ROWS = 22; // sheet rows 1..22 (the last one is cut by the sheet tabs)
const GRID_H = CHROME.rowsBottom - CHROME.gridTop;
const INDIGO = (a: number) => `rgba(91, 108, 240, ${a})`;
const LAVENDER = (a: number) => `rgba(143, 107, 242, ${a})`;
const GREEN = (a: number) => `rgba(52, 160, 120, ${a})`;

// Positions inside the grid container (which starts at CHROME.gridTop).
const gy = (sheetRow: number) => rowTop(sheetRow) - CHROME.gridTop;
const isNumeric = (v: unknown) => typeof v === 'number';

const cellBase: React.CSSProperties = {
	position: 'absolute',
	height: ROW_H,
	borderRight: `1px solid ${C.gridLine}`,
	borderBottom: `1px solid ${C.gridLine}`,
	fontSize: 15,
	lineHeight: `${ROW_H - 1}px`,
	padding: '0 8px',
	whiteSpace: 'nowrap',
	overflow: 'hidden',
	color: C.cellInk,
	boxSizing: 'border-box',
};

export const Spreadsheet: React.FC<{s: DemoState}> = ({s}) => {
	const cols = COL_WIDTHS.length;
	const lastRow = gy(VISIBLE_ROWS + 1);
	const dataRight = colLeft(COLUMNS.length);
	const targetX = colLeft(TARGET_INDEX);
	const targetW = COL_WIDTHS[TARGET_INDEX];

	const cells: React.ReactNode[] = [];
	for (let r = 1; r <= VISIBLE_ROWS; r++) {
		const dataRow = r - 2;
		const values = r === 1 ? [...COLUMNS] : ROWS[dataRow] ?? [];
		for (let c = 0; c < cols; c++) {
			const v = values[c] ?? null;
			const isHeader = r === 1 && c < COLUMNS.length;
			const isTarget = c === TARGET_INDEX;
			const preview = isTarget && r > 1 ? s.cells[dataRow] : undefined;
			let text = formatCell(v as never);
			let color: string = C.cellInk;
			let opacity = 1;
			let shift = 0;
			if (preview && preview.shown > 0) {
				text = String(PREDICTIONS[dataRow]);
				color = mixHex(C.provisional, C.cellInk, preview.committed);
				opacity = preview.shown;
				shift = (1 - preview.shown) * 6;
			}
			const right = r > 1 && (isNumeric(v) || (preview && preview.shown > 0));
			cells.push(
				<div
					key={`${r}-${c}`}
					style={{
						...cellBase,
						left: colLeft(c),
						top: gy(r),
						width: COL_WIDTHS[c],
						textAlign: right ? 'right' : 'left',
						fontWeight: isHeader ? 600 : 400,
						background: isHeader ? '#f7f7fb' : undefined,
						color: isHeader && isTarget ? mixHex('#1f1f1f', '#3a47c8', s.targetTint) : color,
					}}
				>
					<span style={{display: 'inline-block', opacity, transform: `translateY(${shift}px)`}}>{text}</span>
				</div>,
			);
		}
	}

	// Emphasis overlays for the blank / predicted target cells.
	const overlays: React.ReactNode[] = [];
	for (const row of BLANK_ROWS) {
		const r = row + 2;
		if (r > VISIBLE_ROWS) continue;
		const p = s.cells[row];
		const provisional = p.shown * (1 - p.committed);
		const hint = Math.max(s.blankHint, s.inferHint * 0.9);
		const fill = Math.max(hint * 0.16, provisional * 0.1);
		const border = Math.max(hint * 0.5, provisional * 0.42);
		overlays.push(
			<div
				key={`o-${row}`}
				style={{
					position: 'absolute',
					left: targetX + 2,
					top: gy(r) + 2,
					width: targetW - 5,
					height: ROW_H - 5,
					borderRadius: 4,
					background: hint > provisional ? LAVENDER(fill) : INDIGO(fill),
					boxShadow: [
						`inset 0 0 0 1.5px ${hint > provisional ? LAVENDER(border) : INDIGO(border)}`,
						`0 0 0 ${5 * p.flash}px ${p.committed > 0 ? GREEN(0.22 * p.flash) : INDIGO(0.18 * p.flash)}`,
					].join(', '),
				}}
			/>,
		);
	}

	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				top: CHROME.gridTop,
				width: WIN.w,
				height: GRID_H,
				overflow: 'hidden',
				background: '#fff',
			}}
		>
			{/* Target column tint and preview band sit under the cell text */}
			<div
				style={{
					position: 'absolute',
					left: targetX,
					top: gy(1),
					width: targetW,
					height: lastRow - gy(1),
					background: INDIGO(0.055 * s.targetTint + 0.04 * s.previewBand),
					boxShadow: `inset 1.5px 0 0 ${INDIGO(0.35 * s.previewBand)}, inset -1.5px 0 0 ${INDIGO(0.35 * s.previewBand)}`,
				}}
			/>
			{cells}
			{overlays}

			{/* Excluded identifier column, faded while it is excluded */}
			<div
				style={{
					position: 'absolute',
					left: colLeft(0),
					top: gy(1),
					width: COL_WIDTHS[0],
					height: lastRow - gy(1),
					background: `rgba(246, 246, 252, ${0.62 * s.excludedDim})`,
				}}
			/>

			{/* Used range read by the add-in */}
			{s.usedRange > 0 && (
				<div
					style={{
						position: 'absolute',
						left: colLeft(0),
						top: gy(1),
						width: dataRight - colLeft(0),
						height: lastRow - gy(1),
						borderRadius: 3,
						boxShadow: `inset 0 0 0 2px ${INDIGO(0.75 * s.usedRange)}`,
						background: `linear-gradient(180deg, transparent ${s.usedRangeSweep * 100 - 14}%, ${INDIGO(
							0.1 * s.usedRange,
						)} ${s.usedRangeSweep * 100}%, transparent ${s.usedRangeSweep * 100 + 2}%), ${INDIGO(0.035 * s.usedRange)}`,
					}}
				/>
			)}

			{/* Active cell A1 */}
			<div
				style={{
					position: 'absolute',
					left: colLeft(0) - 1,
					top: gy(1) - 1,
					width: COL_WIDTHS[0] + 1,
					height: ROW_H + 1,
					boxShadow: `inset 0 0 0 2px ${C.excelSelect}`,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: colLeft(1) - 4,
					top: gy(2) - 4,
					width: 7,
					height: 7,
					background: C.excelSelect,
					border: '1px solid #fff',
				}}
			/>

			{/* Column letters */}
			<div style={{position: 'absolute', left: 0, top: 0, width: WIN.w, height: CHROME.colHeader, background: C.headerBg}} />
			{COL_LETTERS.map((l, c) => {
				const selected = c === 0;
				const target = c === TARGET_INDEX;
				return (
					<div
						key={l}
						style={{
							position: 'absolute',
							left: colLeft(c),
							top: 0,
							width: COL_WIDTHS[c],
							height: CHROME.colHeader,
							borderRight: `1px solid ${C.headerLine}`,
							borderBottom: selected ? `2px solid ${C.excelSelect}` : `1px solid ${C.headerLine}`,
							background: selected ? '#d3ecdd' : target ? INDIGO(0.1 * s.targetTint) : C.headerBg,
							color: selected ? C.excelGreenDark : '#444',
							fontWeight: selected ? 600 : 400,
							fontSize: 13,
							lineHeight: `${CHROME.colHeader - 1}px`,
							textAlign: 'center',
							boxSizing: 'border-box',
						}}
					>
						{l}
					</div>
				);
			})}

			{/* Row numbers */}
			{Array.from({length: VISIBLE_ROWS}, (_, i) => {
				const r = i + 1;
				const selected = r === 1;
				return (
					<div
						key={r}
						style={{
							position: 'absolute',
							left: 0,
							top: gy(r),
							width: ROW_HEADER_W,
							height: ROW_H,
							background: selected ? '#d3ecdd' : C.headerBg,
							borderRight: selected ? `2px solid ${C.excelSelect}` : `1px solid ${C.headerLine}`,
							borderBottom: `1px solid ${C.headerLine}`,
							color: selected ? C.excelGreenDark : '#444',
							fontWeight: selected ? 600 : 400,
							fontSize: 13,
							lineHeight: `${ROW_H - 1}px`,
							textAlign: 'center',
							boxSizing: 'border-box',
						}}
					>
						{r}
					</div>
				);
			})}
			<div
				style={{
					position: 'absolute',
					left: 0,
					top: 0,
					width: ROW_HEADER_W,
					height: CHROME.colHeader,
					background: C.headerBg,
					borderRight: `1px solid ${C.headerLine}`,
					borderBottom: `1px solid ${C.headerLine}`,
					boxSizing: 'border-box',
				}}
			>
				<svg width="14" height="14" style={{position: 'absolute', right: 4, bottom: 4}}>
					<path d="M14 0 L14 14 L0 14 Z" fill="#c3c3c3" />
				</svg>
			</div>
		</div>
	);
};
