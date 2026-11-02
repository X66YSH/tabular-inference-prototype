import React from 'react';
import {useDemoFrame} from '../lib/frame';
import {easeOut, lerp, prog, window01} from '../lib/anim';
import {C, DOT_GRADIENT, FONT} from '../styles/theme';
import {ModelName} from './ModelName';
import {FLOW_CHIP} from '../timeline';
import {Glass} from './Glass';

const Node: React.FC<{title: React.ReactNode; sub: string; glyph: React.ReactNode; active: number}> = ({title, sub, glyph, active}) => (
	<div style={{display: 'flex', alignItems: 'center', gap: 14}}>
		<div
			style={{
				width: 46,
				height: 46,
				borderRadius: 14,
				background: `rgba(255,255,255,${0.6 + 0.3 * active})`,
				border: `1px solid rgba(98, 104, 186, ${0.16 + 0.3 * active})`,
				boxShadow: `0 0 0 ${4 * active}px rgba(108, 104, 240, ${0.12 * active}), inset 0 1px 0 #fff`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			{glyph}
		</div>
		<div>
			<div style={{fontSize: 20, fontWeight: 650, color: C.ink, letterSpacing: '-0.01em'}}>{title}</div>
			<div style={{fontSize: 15, fontWeight: 500, color: C.inkFaint}}>{sub}</div>
		</div>
	</div>
);

const stroke = {fill: 'none', stroke: '#5b6cf0', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;

// Small schematic of the request path while inference runs. It shows that the
// worksheet data travels to the backend and back; it is not a progress bar.
export const InferenceFlow: React.FC = () => {
	const f = useDemoFrame();
	const o = window01(f, FLOW_CHIP.from, FLOW_CHIP.to, 14, 14);
	if (o <= 0) return null;
	const local = f - FLOW_CHIP.from;
	// A packet goes out, then comes back once results are ready.
	const out = prog(local, 8, 40);
	const back = prog(local, 86, 26);
	const link = (from: number, to: number, t: number) => (t > from && t < to ? (t - from) / (to - from) : -1);
	const packets = [
		{seg: 0, t: link(0, 0.5, out) },
		{seg: 1, t: link(0.5, 1, out)},
		{seg: 1, t: link(0, 0.5, back) >= 0 ? 1 - link(0, 0.5, back) : -1},
		{seg: 0, t: link(0.5, 1, back) >= 0 ? 1 - link(0.5, 1, back) : -1},
	];
	const modelActive = Math.min(prog(local, 46, 10), 1 - prog(local, 90, 10));

	const Link: React.FC<{seg: number}> = ({seg}) => (
		<div style={{position: 'relative', width: 90, height: 2, background: 'rgba(98, 104, 186, 0.22)', borderRadius: 1}}>
			{packets
				.filter((p) => p.seg === seg && p.t >= 0)
				.map((p, i) => (
					<div
						key={i}
						style={{
							position: 'absolute',
							top: -4,
							left: p.t * 90 - 5,
							width: 10,
							height: 10,
							borderRadius: 5,
							background: DOT_GRADIENT,
							boxShadow: '0 0 0 4px rgba(108, 104, 240, 0.16)',
						}}
					/>
				))}
		</div>
	);

	return (
		<div
			style={{
				position: 'absolute',
				top: 34,
				left: 0,
				right: 0,
				display: 'flex',
				justifyContent: 'center',
				opacity: o,
				transform: `translateY(${lerp(-14, 0, prog(local, 0, 16, easeOut))}px)`,
				fontFamily: FONT,
			}}
		>
			<Glass radius={26} style={{padding: '16px 28px'}} inner={{display: 'flex', alignItems: 'center', gap: 22}}>
				<Node
					title="Excel worksheet"
					sub="Office.js add-in"
					active={Math.max(1 - prog(local, 10, 10), prog(local, 110, 8))}
					glyph={
						<svg width="24" height="24" viewBox="0 0 24 24">
							<rect x="3.5" y="4.5" width="17" height="15" rx="2.5" {...stroke} />
							<path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15" {...stroke} />
						</svg>
					}
				/>
				<Link seg={0} />
				<Node
					title="FastAPI backend"
					sub="Prediction API"
					active={Math.max(Math.min(prog(local, 26, 8), 1 - prog(local, 40, 8)), Math.min(prog(local, 96, 8), 1 - prog(local, 108, 8)))}
					glyph={
						<svg width="24" height="24" viewBox="0 0 24 24">
							<rect x="4" y="4" width="16" height="6.5" rx="2" {...stroke} />
							<rect x="4" y="13.5" width="16" height="6.5" rx="2" {...stroke} />
							<path d="M7.5 7.25h.01M7.5 16.75h.01" {...stroke} strokeWidth={2.6} />
						</svg>
					}
				/>
				<Link seg={1} />
				<Node
					title={<ModelName />}
					sub="Pretrained tabular model"
					active={modelActive}
					glyph={
						<svg width="24" height="24" viewBox="0 0 24 24">
							<circle cx="6" cy="7" r="2" {...stroke} />
							<circle cx="6" cy="17" r="2" {...stroke} />
							<circle cx="18" cy="12" r="2" {...stroke} />
							<circle cx="12" cy="12" r="2" {...stroke} />
							<path d="M7.8 7.9 10.2 11M7.8 16.1 10.2 13M14 12h2" {...stroke} />
						</svg>
					}
				/>
			</Glass>
		</div>
	);
};
