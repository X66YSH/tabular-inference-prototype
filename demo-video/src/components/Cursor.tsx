import React from 'react';
import {clamp01, easeOut, prog} from '../lib/anim';

type Props = {x: number; y: number; frame: number; clicks: number[]; opacity: number; scale: number};

// Pointer arrow with a restrained press and ripple on each click.
export const Cursor: React.FC<Props> = ({x, y, frame, clicks, opacity, scale}) => {
	const click = clicks.filter((c) => frame >= c - 4 && frame <= c + 22).pop();
	let press = 1;
	let ripple = 0;
	if (click !== undefined) {
		const down = prog(frame, click - 4, 4);
		const up = prog(frame, click + 1, 6, easeOut);
		press = 1 - 0.14 * (down - up);
		ripple = clamp01((frame - click) / 20);
	}
	return (
		<div style={{position: 'absolute', left: x, top: y, opacity, pointerEvents: 'none', zIndex: 50}}>
			{click !== undefined && frame >= click && (
				<div
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: 64 * scale,
						height: 64 * scale,
						marginLeft: -32 * scale,
						marginTop: -32 * scale,
						borderRadius: '50%',
						border: `${2 * scale}px solid rgba(91, 108, 240, ${0.55 * (1 - ripple)})`,
						background: `rgba(120, 120, 240, ${0.14 * (1 - ripple)})`,
						transform: `scale(${0.25 + ripple * 0.75})`,
					}}
				/>
			)}
			<svg
				width={26 * scale}
				height={34 * scale}
				viewBox="0 0 26 34"
				style={{
					position: 'absolute',
					left: -2 * scale,
					top: -1 * scale,
					transform: `scale(${press})`,
					transformOrigin: '2px 1px',
					filter: 'drop-shadow(0 3px 5px rgba(30, 30, 80, 0.35))',
					overflow: 'visible',
				}}
			>
				<path
					d="M2 1.5 L2 26.5 L8.2 20.6 L12.4 30.4 L16.9 28.5 L12.8 18.9 L21.4 18.9 Z"
					fill="#ffffff"
					stroke="#141a3a"
					strokeWidth={1.6}
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
};
