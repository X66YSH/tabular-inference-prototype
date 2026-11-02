import React from 'react';
import {useDemoFrame} from '../lib/frame';
import {AbsoluteFill} from 'remotion';
import {Glass} from '../components/Glass';
import {ModelName} from '../components/ModelName';
import {FadeUp, Wordmark} from '../components/Wordmark';
import {easeOut, lerp, prog} from '../lib/anim';
import {C, DOT_GRADIENT, FONT} from '../styles/theme';

const BENEFITS = ['No task-specific training', 'Familiar Excel workflow', 'Human-controlled predictions'];
const SLAB = {w: 1360, h: 580};

// Closing frame; settles by ~frame 95 and then holds still.
export const Outro: React.FC = () => {
	const f = useDemoFrame();
	const slab = prog(f, 0, 36, easeOut);
	return (
		<AbsoluteFill style={{fontFamily: FONT}}>
			<div
				style={{
					position: 'absolute',
					left: (1920 - SLAB.w) / 2,
					top: (1080 - SLAB.h) / 2 - 10,
					width: SLAB.w,
					height: SLAB.h,
					opacity: slab,
					transform: `translateY(${lerp(30, 0, slab)}px) scale(${lerp(0.97, 1, slab)})`,
					filter: slab < 1 ? `blur(${(1 - slab) * 14}px)` : undefined,
				}}
			>
				<Glass radius={40} style={{width: SLAB.w, height: SLAB.h}} />
			</div>
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', paddingBottom: 20}}>
				<Wordmark text="Tabular AI for Excel" size={104} frame={f} start={10} />
				<FadeUp frame={f} start={28} style={{marginTop: 10}}>
					<div style={{fontSize: 44, fontWeight: 500, letterSpacing: '-0.02em', color: '#2c3260'}}>Predictive AI. Inside Excel.</div>
				</FadeUp>
				<div style={{display: 'flex', gap: 20, marginTop: 56}}>
					{BENEFITS.map((b, i) => {
						const t = prog(f, 44 + i * 8, 22, easeOut);
						return (
							<div key={b} style={{opacity: t, transform: `translateY(${lerp(18, 0, t)}px)`}}>
								<Glass
									radius={22}
									style={{
										padding: '18px 28px 18px 20px',
										display: 'flex',
										alignItems: 'center',
										background: 'linear-gradient(155deg, rgba(255,255,255,0.8), rgba(250,248,255,0.6))',
									}}
								>
									<div style={{display: 'flex', alignItems: 'center', gap: 14}}>
										<div
											style={{
												width: 34,
												height: 34,
												borderRadius: 17,
												background: DOT_GRADIENT,
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												boxShadow: '0 6px 14px -6px rgba(92, 88, 230, 0.7)',
											}}
										>
											<svg width="18" height="18" viewBox="0 0 14 14">
												<path d="M3.5 7.2l2.3 2.3 4.7-5" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</div>
										<span style={{fontSize: 27, fontWeight: 600, color: C.ink, letterSpacing: '-0.01em'}}>{b}</span>
									</div>
								</Glass>
							</div>
						);
					})}
				</div>
			</AbsoluteFill>
			<FadeUp frame={f} start={74} style={{position: 'absolute', bottom: 64, left: 0, right: 0, textAlign: 'center'}}>
				<div style={{fontSize: 21, fontWeight: 500, color: C.inkSoft, letterSpacing: '0.01em'}}>
					Prototype powered by <ModelName />
					<span style={{margin: '0 12px', color: C.inkFaint}}>·</span>
					<span style={{color: C.inkFaint}}>Illustrative demo with synthetic data</span>
				</div>
			</FadeUp>
		</AbsoluteFill>
	);
};
