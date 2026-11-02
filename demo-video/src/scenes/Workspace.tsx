import React from 'react';
import {useDemoFrame} from '../lib/frame';
import {AbsoluteFill} from 'remotion';
import {Cursor} from '../components/Cursor';
import {ExcelWindow} from '../components/ExcelChrome';
import {Spreadsheet} from '../components/Spreadsheet';
import {TaskPane} from '../components/TaskPane';
import {worldToPane} from '../layout';
import {cameraAt, cameraTransform, cursorAt, easeIn, easeOut, lerp, prog, pulse} from '../lib/anim';
import {getState} from '../state';
import {CAMERA, CLICKS, CURSOR, T} from '../timeline';

// Steps 1–7: one continuous Excel session under a scripted camera.
export const Workspace: React.FC = () => {
	const f = useDemoFrame();
	const s = getState(f);
	const cam = cameraAt(f, CAMERA);
	const cur = cursorAt(f, CURSOR);

	const enter = prog(f, T.workspaceIn, 56, easeOut);
	const exit = prog(f, T.workspaceOut, 34, easeIn);
	// Step 7 shows two alternative outcomes; a soft blur marks the switch.
	const rewind = pulse(f, T.rewind[0], T.rewind[2] - T.rewind[0]);
	const blur = (1 - enter) * 14 + exit * 12 + rewind * 9;

	const cursorOpacity = prog(f, T.cursorIn, 14) * (1 - rewind) * (1 - prog(f, 2000, 16));

	return (
		<AbsoluteFill style={{opacity: enter * (1 - exit), filter: blur > 0.05 ? `blur(${blur}px)` : undefined}}>
			<div
				style={{
					position: 'absolute',
					width: 1920,
					height: 1080,
					transformOrigin: '0 0',
					transform: cameraTransform(cam),
				}}
			>
				<ExcelWindow
					nameBox="A1"
					formula="customer_id"
					grid={<Spreadsheet s={s} />}
					pane={<TaskPane s={s} frame={f} cursor={cursorOpacity > 0 ? worldToPane(cur.x, cur.y, s.scroll) : null} />}
				/>
				{cursorOpacity > 0 && (
					<Cursor x={cur.x} y={cur.y} frame={f} clicks={CLICKS} opacity={cursorOpacity} scale={1 / Math.sqrt(cam.z)} />
				)}
			</div>
			{rewind > 0 && <AbsoluteFill style={{background: `rgba(244, 242, 255, ${0.4 * rewind})`}} />}
			{/* Honest framing for a scripted demo */}
			<div
				style={{
					position: 'absolute',
					left: 22,
					bottom: 26,
					padding: '7px 14px',
					borderRadius: 14,
					background: 'rgba(250, 249, 255, 0.92)',
					border: '1px solid rgba(255, 255, 255, 0.9)',
					boxShadow: '0 6px 16px -10px rgba(64, 60, 150, 0.4)',
					fontSize: 15,
					fontWeight: 500,
					color: 'rgba(86, 93, 140, 0.9)',
					opacity: lerp(0, 1, prog(f, 160, 20)),
				}}
			>
				Illustrative demo · synthetic data
			</div>
		</AbsoluteFill>
	);
};
