import React from 'react';
import {COLUMNS} from '../data/dataset';
import {K, PANE, PANE_CONTENT_H, PANE_NATIVE_VIEW_H, PANE_NATIVE_W, type Rect, listItem, menuOption} from '../layout';
import {easeOut, isPressed, lerp, prog} from '../lib/anim';
import type {DemoState, MenuId} from '../state';
import {BUTTON_GRADIENT, C, DOT_GRADIENT, TITLE_GRADIENT} from '../styles/theme';
import {T} from '../timeline';
import {WithModelName} from './ModelName';

// Visual replica of excel-addin/src/App.jsx + App.css, driven by DemoState.

const RADIUS = 11;
const inside = (p: {x: number; y: number} | null, r: Rect) =>
	!!p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

const CHEVRON = (color: string) =>
	`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10' fill='none' stroke='${encodeURIComponent(
		color,
	)}' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2.5 4l2.5 2.5L7.5 4'/%3E%3C/svg%3E")`;

type Kind = 'default' | 'primary' | 'accept' | 'discard';

function controlStyle(r: Rect, kind: Kind, o: {hover: boolean; pressed: boolean; disabled: boolean}): React.CSSProperties {
	const base: React.CSSProperties = {
		position: 'absolute',
		left: r.x,
		top: r.y,
		width: r.w,
		height: r.h,
		borderRadius: RADIUS,
		border: `1px solid ${C.edge}`,
		background: 'rgba(255, 255, 255, 0.5)',
		color: '#3a47a8',
		fontSize: 12.5,
		fontWeight: 600,
		letterSpacing: '-0.005em',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		boxShadow: '0 1px 2px rgba(64, 60, 150, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
		boxSizing: 'border-box',
		transform: o.pressed ? 'scale(0.985)' : undefined,
	};
	if (o.disabled) {
		return {
			...base,
			border: '1px solid rgba(98, 104, 186, 0.1)',
			background: 'rgba(255, 255, 255, 0.28)',
			color: '#8085ab',
			boxShadow: 'none',
		};
	}
	if (kind === 'primary') {
		Object.assign(base, {
			border: '1px solid rgba(80, 70, 200, 0.35)',
			background: BUTTON_GRADIENT,
			color: '#fff',
			boxShadow: o.hover
				? '0 10px 22px -8px rgba(92, 88, 230, 0.8), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(40,30,140,0.18)'
				: '0 8px 18px -8px rgba(92, 88, 230, 0.7), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(40,30,140,0.18)',
			filter: o.hover ? 'brightness(1.06) saturate(1.05)' : undefined,
		});
	} else if (kind === 'accept') {
		Object.assign(base, {
			border: `1px solid rgba(52, 160, 120, ${o.hover ? 0.42 : 0.28})`,
			background: o.hover ? 'rgba(200, 242, 225, 0.85)' : 'rgba(214, 246, 233, 0.7)',
			color: '#18744f',
		});
	} else if (kind === 'discard') {
		Object.assign(base, {
			color: o.hover ? '#a8355f' : C.inkSoft,
			border: o.hover ? '1px solid rgba(214, 90, 130, 0.3)' : base.border,
			background: o.hover ? 'rgba(255, 233, 241, 0.75)' : base.background,
		});
	} else if (o.hover) {
		Object.assign(base, {
			border: '1px solid rgba(98, 104, 186, 0.3)',
			background: 'rgba(255, 255, 255, 0.72)',
			boxShadow: '0 3px 10px -4px rgba(64, 60, 150, 0.22), inset 0 1px 0 #fff',
		});
	}
	if (o.pressed) base.boxShadow = 'inset 0 1px 3px rgba(40, 36, 120, 0.16)';
	return base;
}

const Label: React.FC<{y: number; children: React.ReactNode}> = ({y, children}) => (
	<div
		style={{
			position: 'absolute',
			left: 26,
			top: y,
			fontSize: 11,
			fontWeight: 600,
			lineHeight: 1.3,
			letterSpacing: '0.01em',
			color: C.inkSoft,
		}}
	>
		{children}
	</div>
);

const Select: React.FC<{r: Rect; value: string; open: boolean; hover: boolean; disabled: boolean}> = ({
	r,
	value,
	open,
	hover,
	disabled,
}) => {
	const base = controlStyle(r, 'default', {hover: hover || open, pressed: false, disabled});
	return (
		<div
			style={{
				...base,
				justifyContent: 'flex-start',
				padding: '6px 30px 6px 10px',
				fontWeight: 400,
				color: disabled ? '#8085ab' : C.ink,
				// One shorthand only: mixing it with background-* longhands lets React
				// drop no-repeat when the state flips, tiling the chevron.
				background: `${CHEVRON(disabled ? '#a3a7c9' : '#6a6fa6')} right 10px center / 10px no-repeat, ${base.background}`,
				...(open ? {border: '1px solid rgba(91, 108, 240, 0.55)', boxShadow: '0 0 0 3px rgba(91, 108, 240, 0.14)'} : {}),
			}}
		>
			{value}
		</div>
	);
};

const Menu: React.FC<{select: Rect; options: string[]; selected: number; hovered: number; t: number}> = ({
	select,
	options,
	selected,
	hovered,
	t,
}) => {
	const first = menuOption(select, 0);
	return (
		<div
			style={{
				position: 'absolute',
				left: select.x,
				top: first.y - 4,
				width: select.w,
				padding: 4,
				borderRadius: 9,
				background: 'rgba(255, 255, 255, 0.98)',
				border: '1px solid rgba(98, 104, 186, 0.2)',
				boxShadow: '0 16px 36px -12px rgba(40, 36, 120, 0.35), 0 2px 6px rgba(40, 36, 120, 0.08)',
				opacity: t,
				transform: `translateY(${lerp(-4, 0, t)}px) scaleY(${lerp(0.96, 1, t)})`,
				transformOrigin: 'top',
				zIndex: 20,
				boxSizing: 'border-box',
			}}
		>
			{options.map((o, i) => (
				<div
					key={o}
					style={{
						height: 26,
						borderRadius: 6,
						padding: '0 10px 0 26px',
						display: 'flex',
						alignItems: 'center',
						fontSize: 12.5,
						position: 'relative',
						color: i === 0 && o.startsWith('Select') ? C.inkFaint : C.ink,
						background: i === hovered ? 'rgba(108, 112, 240, 0.14)' : 'transparent',
						fontWeight: i === selected ? 600 : 400,
					}}
				>
					{i === selected && (
						<svg width="12" height="12" viewBox="0 0 14 14" style={{position: 'absolute', left: 8}}>
							<path d="M3.5 7.2l2.3 2.3 4.7-5" fill="none" stroke={C.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					)}
					{o}
				</div>
			))}
		</div>
	);
};

const TARGET_OPTIONS = ['Select Target Column', ...COLUMNS];
const MODE_OPTIONS = ['Prediction', 'Evaluation'];
const TASK_OPTIONS = ['Classification', 'Regression'];

type Props = {s: DemoState; frame: number; cursor: {x: number; y: number} | null};

export const TaskPane: React.FC<Props> = ({s, frame, cursor}) => {
	const L = s.layout;
	const p = cursor;
	const locked = s.previewActive;
	const menuOpen = (id: MenuId) => s.menu.id === id && s.menu.t > 0;
	const anyMenu = s.menu.id !== null;
	const hov = (r: Rect) => !anyMenu && inside(p, r);

	const hoveredOption = (select: Rect, n: number, fallback: number) => {
		for (let i = 0; i < n; i++) if (inside(p, menuOption(select, i))) return i;
		return fallback;
	};

	const columns = s.loaded ? COLUMNS : [];
	const listCols = COLUMNS.map((c, i) => ({c, h: s.itemHeights[i]})).filter(({h}) => h > 0.5);

	const msgFresh = prog(frame, s.messageChangedAt, 8, easeOut);
	const thumbH = (PANE_NATIVE_VIEW_H / Math.max(L.contentH, PANE_NATIVE_VIEW_H)) * PANE_NATIVE_VIEW_H;
	const thumbY = (s.scroll / Math.max(L.contentH, PANE_NATIVE_VIEW_H)) * PANE_NATIVE_VIEW_H;

	return (
		<div
			style={{
				position: 'absolute',
				left: PANE.x,
				top: PANE.y,
				width: PANE.w,
				height: PANE.bottom - PANE.y,
				transform: `translateX(${(1 - s.paneIn) * (PANE.w + 20)}px)`,
				opacity: lerp(0.4, 1, s.paneIn),
				background: '#fff',
				borderLeft: '1px solid #d4d4d4',
				boxShadow: '-12px 0 30px -18px rgba(40, 40, 100, 0.25)',
			}}
		>
			{/* Office task pane header */}
			<div
				style={{
					height: PANE.header,
					display: 'flex',
					alignItems: 'center',
					padding: '0 14px 0 16px',
					borderBottom: '1px solid #e6e6e6',
					fontSize: 15,
					fontWeight: 600,
					color: '#242424',
				}}
			>
				Tabular AI
				<div style={{marginLeft: 'auto', display: 'flex', gap: 16}}>
					<svg width="14" height="14" viewBox="0 0 20 20">
						<path d="M5 8l5 5 5-5" fill="none" stroke="#555" strokeWidth={1.6} strokeLinecap="round" />
					</svg>
					<svg width="14" height="14" viewBox="0 0 20 20">
						<path d="M5 5l10 10M15 5L5 15" fill="none" stroke="#555" strokeWidth={1.6} strokeLinecap="round" />
					</svg>
				</div>
			</div>

			{/* Add-in web content */}
			<div style={{position: 'relative', height: PANE_CONTENT_H, overflow: 'hidden'}}>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						background: [
							'radial-gradient(60% 45% at 8% 4%, rgba(140, 178, 255, 0.85), transparent 70%)',
							'radial-gradient(55% 40% at 96% 22%, rgba(190, 166, 255, 0.8), transparent 70%)',
							'radial-gradient(50% 38% at 20% 62%, rgba(168, 214, 255, 0.6), transparent 70%)',
							'radial-gradient(60% 45% at 88% 92%, rgba(236, 190, 246, 0.55), transparent 72%)',
							'linear-gradient(160deg, #e6ecff 0%, #ece6fd 55%, #f2eafb 100%)',
						].join(', '),
					}}
				/>
				<div
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: PANE_NATIVE_W,
						height: Math.max(L.contentH, PANE_NATIVE_VIEW_H),
						transform: `scale(${K}) translateY(${-s.scroll}px)`,
						transformOrigin: '0 0',
						color: C.ink,
						lineHeight: 1.45,
					}}
				>
					{/* .glass */}
					<div
						style={{
							position: 'absolute',
							left: 10,
							top: 14,
							width: PANE_NATIVE_W - 20,
							height: L.glassBottom - 14,
							borderRadius: 22,
							border: `1px solid ${C.hairline}`,
							background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0.3))',
							backdropFilter: 'blur(24px) saturate(180%)',
							boxShadow:
								'0 18px 40px -22px rgba(64, 60, 150, 0.38), 0 2px 6px -2px rgba(64, 60, 150, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(150, 140, 230, 0.12)',
						}}
					>
						<div
							style={{
								position: 'absolute',
								inset: 0,
								borderRadius: 22,
								background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0) 90px)',
							}}
						/>
					</div>

					<div
						style={{
							position: 'absolute',
							left: 24,
							top: L.title,
							fontSize: 21,
							fontWeight: 700,
							lineHeight: 1.15,
							letterSpacing: '-0.025em',
							background: TITLE_GRADIENT,
							WebkitBackgroundClip: 'text',
							backgroundClip: 'text',
							color: 'transparent',
						}}
					>
						Tabular AI
					</div>
					<div style={{position: 'absolute', left: 24, top: L.subtitle, fontSize: 11.5, color: C.inkFaint, letterSpacing: '0.005em'}}>
						<WithModelName text="Excel Add-in powered by TabICLv2" />
					</div>

					<div
						style={controlStyle(L.read, 'default', {
							hover: hov(L.read),
							pressed: isPressed(frame, T.readClick),
							disabled: locked,
						})}
					>
						Read Excel Data
					</div>

					<Label y={L.target.label}>Target Column</Label>
					<Select
						r={L.target.select}
						value={s.target || 'Select Target Column'}
						open={menuOpen('target')}
						hover={hov(L.target.select)}
						disabled={locked}
					/>
					<Label y={L.mode.label}>Mode</Label>
					<Select r={L.mode.select} value="Prediction" open={menuOpen('mode')} hover={hov(L.mode.select)} disabled={locked} />
					<Label y={L.task.label}>Task Type</Label>
					<Select r={L.task.select} value="Classification" open={menuOpen('task')} hover={hov(L.task.select)} disabled={locked} />

					<Label y={L.excludedLabel}>Excluded Columns</Label>
					{L.list.h > 0 && (
						<div
							style={{
								position: 'absolute',
								left: L.list.x,
								top: L.list.y,
								width: L.list.w,
								height: L.list.h,
								overflow: 'hidden',
								borderRadius: RADIUS,
								border: `1px solid ${C.edge}`,
								background: 'rgba(255, 255, 255, 0.34)',
								boxShadow: 'inset 0 1px 2px rgba(64, 60, 150, 0.06)',
								boxSizing: 'border-box',
							}}
						>
							{(() => {
								let y = 3;
								return listCols.map(({c, h}, i) => {
									const checked = s.excluded.includes(c);
									const itemTop = y;
									y += h;
									const r = listItem(L.list, i);
									const hovering = !locked && !anyMenu && inside(p, r);
									const t = checked ? s.excludeCheckT : 0;
									return (
										<div
											key={c}
											style={{
												position: 'absolute',
												left: 3,
												right: 3,
												top: itemTop,
												height: h,
												overflow: 'hidden',
												opacity: h / 28,
												display: 'flex',
												alignItems: 'center',
												gap: 8,
												padding: '0 8px',
												borderRadius: 8,
												fontSize: 12.5,
												fontWeight: 450,
												color: locked ? C.inkFaint : checked ? '#3a3f99' : C.ink,
												background: checked
													? `rgba(120, 120, 240, ${0.1 * t})`
													: hovering
														? 'rgba(255, 255, 255, 0.6)'
														: 'transparent',
											}}
										>
											<div
												style={{
													flex: '0 0 14px',
													height: 14,
													borderRadius: 4,
													boxSizing: 'border-box',
													border: t > 0 ? 'none' : `1px solid rgba(${hovering ? '91, 108, 240, 0.6' : '98, 104, 186, 0.4'})`,
													background: t > 0 ? 'linear-gradient(135deg, #5a7cf6, #8a68ee)' : 'rgba(255, 255, 255, 0.85)',
													boxShadow: t > 0 ? '0 2px 5px -1px rgba(92, 88, 230, 0.45)' : 'inset 0 1px 1px rgba(64, 60, 150, 0.08)',
													opacity: locked ? 0.6 : 1,
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													transform: `scale(${t > 0 ? lerp(0.8, 1, t) : 1})`,
												}}
											>
												{t > 0 && (
													<svg width="12" height="12" viewBox="0 0 14 14">
														<path
															d="M3.5 7.2l2.3 2.3 4.7-5"
															fill="none"
															stroke="white"
															strokeWidth={1.8}
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeDasharray={12}
															strokeDashoffset={12 * (1 - t)}
														/>
													</svg>
												)}
											</div>
											{c}
										</div>
									);
								});
							})()}
						</div>
					)}

					<div
						style={controlStyle(L.send, 'primary', {
							hover: hov(L.send),
							pressed: isPressed(frame, T.sendClick),
							disabled: locked,
						})}
					>
						Send Data to Backend
					</div>

					{/* Status line */}
					<div
						style={{
							position: 'absolute',
							left: L.status.x,
							top: L.status.y,
							width: L.status.w,
							height: L.status.h,
							display: 'flex',
							alignItems: 'flex-start',
							gap: 7,
							padding: '7px 10px',
							borderRadius: RADIUS,
							border: '1px solid rgba(255, 255, 255, 0.6)',
							background: 'linear-gradient(120deg, rgba(225, 232, 255, 0.55), rgba(238, 228, 255, 0.45))',
							color: C.inkSoft,
							fontSize: 11.5,
							lineHeight: 1.45,
							boxSizing: 'border-box',
							overflow: 'hidden',
						}}
					>
						{s.running && (
							<div
								style={{
									position: 'absolute',
									inset: 0,
									background: `linear-gradient(100deg, transparent ${((frame - T.sendClick) * 2.2) % 160 - 40}%, rgba(255,255,255,0.7) ${
										((frame - T.sendClick) * 2.2) % 160 - 20
									}%, transparent ${((frame - T.sendClick) * 2.2) % 160}%)`,
								}}
							/>
						)}
						<div
							style={{
								flex: '0 0 6px',
								height: 6,
								marginTop: 6,
								borderRadius: 3,
								background: DOT_GRADIENT,
								boxShadow: `0 0 0 ${3 + (s.running ? 2 * Math.abs(Math.sin(frame / 8)) : 0)}px rgba(108, 104, 240, 0.14)`,
							}}
						/>
						<div style={{position: 'relative'}}>
							Message from Backend:{' '}
							<span style={{color: C.ink, fontWeight: 500, opacity: lerp(0.2, 1, msgFresh)}}>
								<WithModelName text={s.message} />
							</span>
						</div>
					</div>

					<div
						style={controlStyle(L.preview, 'default', {
							hover: hov(L.preview),
							pressed: isPressed(frame, T.previewClick),
							disabled: !s.predictionsReady || s.previewActive,
						})}
					>
						Preview in Excel
					</div>

					{s.acceptT > 0 && (
						<div style={{opacity: s.acceptT, transform: `translateY(${lerp(-6, 0, s.acceptT)}px)`}}>
							<div style={controlStyle(L.accept, 'accept', {hover: hov(L.accept), pressed: isPressed(frame, T.acceptClick), disabled: false})}>
								Accept
							</div>
							<div
								style={controlStyle(L.discard, 'discard', {hover: hov(L.discard), pressed: isPressed(frame, T.discardClick), disabled: false})}
							>
								Discard
							</div>
						</div>
					)}

					{/* Native select popups */}
					{menuOpen('target') && (
						<Menu
							select={L.target.select}
							options={['Select Target Column', ...columns]}
							selected={s.target ? TARGET_OPTIONS.indexOf(s.target) : 0}
							hovered={hoveredOption(L.target.select, columns.length + 1, -1)}
							t={s.menu.t}
						/>
					)}
					{menuOpen('mode') && (
						<Menu select={L.mode.select} options={MODE_OPTIONS} selected={0} hovered={hoveredOption(L.mode.select, 2, -1)} t={s.menu.t} />
					)}
					{menuOpen('task') && (
						<Menu select={L.task.select} options={TASK_OPTIONS} selected={0} hovered={hoveredOption(L.task.select, 2, -1)} t={s.menu.t} />
					)}
				</div>

				{/* Overlay scrollbar, shown while scrolling */}
				<div
					style={{
						position: 'absolute',
						right: 3,
						top: thumbY * K + 4,
						width: 5,
						height: thumbH * K - 8,
						borderRadius: 3,
						background: 'rgba(110, 110, 190, 0.45)',
						opacity: s.scrolling,
					}}
				/>
			</div>
		</div>
	);
};
