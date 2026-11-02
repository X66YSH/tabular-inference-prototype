import React from 'react';
import {useDemoFrame} from '../lib/frame';
import {AbsoluteFill} from 'remotion';

// The add-in's ambient light field, enlarged and drifting very slowly.
export const Background: React.FC = () => {
	const f = useDemoFrame();
	const d = (period: number, amp: number, phase = 0) => Math.sin((f / period) * Math.PI * 2 + phase) * amp;
	return (
		<AbsoluteFill
			style={{
				background: [
					`radial-gradient(48% 42% at ${10 + d(900, 4)}% ${6 + d(1100, 3, 1)}%, rgba(140, 178, 255, 0.85), transparent 70%)`,
					`radial-gradient(44% 40% at ${94 + d(1000, 3, 2)}% ${20 + d(800, 4)}%, rgba(190, 166, 255, 0.8), transparent 70%)`,
					`radial-gradient(42% 38% at ${22 + d(1200, 5, 3)}% ${70 + d(950, 3)}%, rgba(168, 214, 255, 0.6), transparent 70%)`,
					`radial-gradient(50% 45% at ${86 + d(1050, 4, 1)}% ${94 + d(900, 3, 2)}%, rgba(236, 190, 246, 0.55), transparent 72%)`,
					'linear-gradient(160deg, #e6ecff 0%, #ece6fd 55%, #f2eafb 100%)',
				].join(', '),
			}}
		/>
	);
};
