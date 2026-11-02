import React from 'react';
import {easeOut, lerp, prog} from '../lib/anim';
import {TITLE_GRADIENT} from '../styles/theme';

// Gradient headline revealed with a soft left-to-right wipe.
export const Wordmark: React.FC<{text: string; size: number; frame: number; start: number; dur?: number}> = ({
	text,
	size,
	frame,
	start,
	dur = 34,
}) => {
	const t = prog(frame, start, dur, easeOut);
	const edge = lerp(-20, 120, t);
	const mask = `linear-gradient(90deg, #000 ${edge - 20}%, transparent ${edge}%)`;
	return (
		<div
			style={{
				fontSize: size,
				fontWeight: 700,
				letterSpacing: '-0.035em',
				lineHeight: 1.1,
				paddingBottom: size * 0.08,
				background: TITLE_GRADIENT,
				WebkitBackgroundClip: 'text',
				backgroundClip: 'text',
				color: 'transparent',
				WebkitMaskImage: mask,
				maskImage: mask,
				transform: `translateY(${lerp(18, 0, t)}px)`,
				filter: t < 1 ? `blur(${(1 - t) * 8}px)` : undefined,
			}}
		>
			{text}
		</div>
	);
};

export const FadeUp: React.FC<{frame: number; start: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
	frame,
	start,
	dur = 24,
	children,
	style,
}) => {
	const t = prog(frame, start, dur, easeOut);
	return <div style={{opacity: t, transform: `translateY(${lerp(16, 0, t)}px)`, ...style}}>{children}</div>;
};
