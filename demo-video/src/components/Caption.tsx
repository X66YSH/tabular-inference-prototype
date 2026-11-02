import React from 'react';
import {useDemoFrame} from '../lib/frame';
import {easeIn, easeOut, lerp, prog} from '../lib/anim';
import {C, DOT_GRADIENT, FONT, TITLE_GRADIENT} from '../styles/theme';
import {CAPTIONS} from '../timeline';
import {Glass} from './Glass';
import {WithModelName} from './ModelName';

const W = 1120;
const H = 88;

// Bottom-centred step caption with a 7-step progress rail.
export const Caption: React.FC = () => {
	const f = useDemoFrame();
	const first = CAPTIONS[0].from;
	const last = CAPTIONS[CAPTIONS.length - 1].to;
	const shell = Math.min(prog(f, first, 20, easeOut), 1 - prog(f, last - 14, 14, easeIn));
	if (shell <= 0) return null;

	const cap = CAPTIONS.find((c) => f >= c.from && f < c.to) ?? CAPTIONS[CAPTIONS.length - 1];
	const prev = CAPTIONS[CAPTIONS.indexOf(cap) - 1];
	const stepChanged = !prev || prev.step !== cap.step;
	const inT = prog(f, cap.from, 16, easeOut);
	const outT = cap === CAPTIONS[CAPTIONS.length - 1] ? 0 : prog(f, cap.to - 8, 8, easeIn);
	const textOpacity = Math.min(inT, 1 - outT);
	const badgeOpacity = stepChanged ? textOpacity : 1;

	return (
		<div
			style={{
				position: 'absolute',
				left: (1920 - W) / 2,
				top: 1080 - 22 - H,
				width: W,
				height: H,
				opacity: shell,
				transform: `translateY(${lerp(24, 0, shell)}px)`,
				fontFamily: FONT,
			}}
		>
			<Glass radius={28} style={{height: H, background: 'linear-gradient(155deg, rgba(255,255,255,0.84), rgba(248,246,255,0.7))'}}>
				<div style={{display: 'flex', alignItems: 'center', height: H, padding: '0 30px 0 20px', gap: 22}}>
					<div
						style={{
							flex: '0 0 50px',
							height: 50,
							borderRadius: 25,
							background: DOT_GRADIENT,
							boxShadow: '0 8px 18px -8px rgba(92, 88, 230, 0.8), inset 0 1px 0 rgba(255,255,255,0.4)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: 'white',
							fontSize: 24,
							fontWeight: 700,
						}}
					>
						<span style={{opacity: badgeOpacity}}>{cap.step}</span>
					</div>
					<div
						style={{
							flex: 1,
							minWidth: 0,
							opacity: textOpacity,
							transform: `translateY(${lerp(8, 0, inT)}px)`,
						}}
					>
						<div
							style={{
								fontSize: cap.hero ? 31 : 29,
								fontWeight: 650,
								letterSpacing: '-0.02em',
								lineHeight: 1.15,
								whiteSpace: 'nowrap',
								...(cap.hero
									? {background: TITLE_GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}
									: {color: C.ink}),
							}}
						>
							<WithModelName text={cap.title} />
						</div>
						<div style={{marginTop: 5, fontSize: 19, color: C.inkSoft, fontWeight: 500, whiteSpace: 'nowrap'}}>
							<span style={{color: C.inkFaint, fontWeight: 600, letterSpacing: '0.04em'}}>STEP {cap.step} OF 7</span>
							<span style={{margin: '0 10px', color: C.inkFaint}}>·</span>
							{cap.sub}
						</div>
					</div>
					<div style={{display: 'flex', gap: 6}}>
						{Array.from({length: 7}, (_, i) => {
							const done = i + 1 < cap.step;
							const current = i + 1 === cap.step;
							return (
								<div
									key={i}
									style={{
										width: current ? 30 : 12,
										height: 6,
										borderRadius: 3,
										background: current ? DOT_GRADIENT : done ? 'rgba(106, 99, 240, 0.45)' : 'rgba(98, 104, 186, 0.18)',
									}}
								/>
							);
						})}
					</div>
				</div>
			</Glass>
		</div>
	);
};
