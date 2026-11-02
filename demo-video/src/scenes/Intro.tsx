import React from 'react';
import {useDemoFrame} from '../lib/frame';
import {AbsoluteFill} from 'remotion';
import {Glass} from '../components/Glass';
import {FadeUp, Wordmark} from '../components/Wordmark';
import {easeIn, easeOut, lerp, prog} from '../lib/anim';
import {C, FONT} from '../styles/theme';
import {T} from '../timeline';

const SLAB = {w: 1120, h: 560};

// Faint spreadsheet motif inside the glass, with a few cells quietly filling.
const GridMotif: React.FC<{frame: number}> = ({frame}) => {
	const cols = [0, 150, 300, 450, 600, 750, 900, 1050];
	const rows = Array.from({length: 13}, (_, i) => i * 46);
	const fills = [
		{c: 6, r: 2, at: 66, v: '1'},
		{c: 6, r: 5, at: 76, v: '0'},
		{c: 6, r: 8, at: 86, v: '0'},
		{c: 6, r: 10, at: 96, v: '1'},
	];
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				borderRadius: 36,
				overflow: 'hidden',
				WebkitMaskImage: 'radial-gradient(70% 80% at 50% 50%, rgba(0,0,0,0.9), transparent 85%)',
				maskImage: 'radial-gradient(70% 80% at 50% 50%, rgba(0,0,0,0.9), transparent 85%)',
			}}
		>
			{cols.map((x) => (
				<div key={`c${x}`} style={{position: 'absolute', left: x + 30, top: 0, bottom: 0, width: 1, background: 'rgba(98, 104, 186, 0.13)'}} />
			))}
			{rows.map((y) => (
				<div key={`r${y}`} style={{position: 'absolute', top: y + 12, left: 0, right: 0, height: 1, background: 'rgba(98, 104, 186, 0.13)'}} />
			))}
			{fills.map(({c, r, at, v}) => {
				const t = prog(frame, at, 18, easeOut);
				return (
					<div
						key={`${c}-${r}`}
						style={{
							position: 'absolute',
							left: cols[c] + 33,
							top: rows[r] + 15,
							width: 144,
							height: 40,
							borderRadius: 6,
							background: `rgba(120, 120, 240, ${0.12 * t})`,
							boxShadow: `inset 0 0 0 1.5px rgba(91, 108, 240, ${0.35 * t})`,
							color: `rgba(110, 110, 150, ${0.8 * t})`,
							fontSize: 22,
							fontWeight: 500,
							textAlign: 'right',
							padding: '6px 14px',
							boxSizing: 'border-box',
						}}
					>
						{v}
					</div>
				);
			})}
		</div>
	);
};

export const Intro: React.FC = () => {
	const f = useDemoFrame();
	const push = 1 + 0.045 * prog(f, 0, T.introEnd, (t) => t);
	const exit = prog(f, 112, 46, easeIn);
	const slab = prog(f, 4, 44, easeOut);

	return (
		<AbsoluteFill
			style={{
				fontFamily: FONT,
				opacity: 1 - exit,
				transform: `scale(${push + exit * 0.08})`,
				filter: exit > 0.01 ? `blur(${exit * 14}px)` : undefined,
			}}
		>
			<div
				style={{
					position: 'absolute',
					left: (1920 - SLAB.w) / 2,
					top: (1080 - SLAB.h) / 2,
					width: SLAB.w,
					height: SLAB.h,
					opacity: slab,
					transform: `translateY(${lerp(40, 0, slab)}px) scale(${lerp(0.96, 1, slab)})`,
					filter: slab < 1 ? `blur(${(1 - slab) * 16}px)` : undefined,
				}}
			>
				<Glass radius={36} style={{width: SLAB.w, height: SLAB.h}}>
					<GridMotif frame={f} />
				</Glass>
			</div>
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
				<FadeUp frame={f} start={16} style={{marginBottom: 18}}>
					<div
						style={{
							fontSize: 20,
							fontWeight: 600,
							letterSpacing: '0.14em',
							textTransform: 'uppercase',
							color: C.accent,
						}}
					>
						Excel Add-in · Proof of Concept
					</div>
				</FadeUp>
				<Wordmark text="Tabular AI" size={150} frame={f} start={22} />
				<FadeUp frame={f} start={56} dur={28} style={{marginTop: 14}}>
					<div style={{fontSize: 48, fontWeight: 500, letterSpacing: '-0.02em', color: '#2c3260'}}>Predictive AI. Inside Excel.</div>
				</FadeUp>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
