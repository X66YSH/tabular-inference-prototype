import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Background} from './components/Background';
import {Caption} from './components/Caption';
import {InferenceFlow} from './components/InferenceFlow';
import {DemoFrameProvider} from './lib/frame';
import {Intro} from './scenes/Intro';
import {Outro} from './scenes/Outro';
import {Workspace} from './scenes/Workspace';
import {FONT} from './styles/theme';
import {T} from './timeline';

// `speed` plays the same story faster: each output frame samples story time
// frame × speed, so motion stays smooth instead of dropping frames.
export const DemoVideo: React.FC<{speed?: number}> = ({speed = 1}) => {
	const f = useCurrentFrame() * speed;
	return (
		<DemoFrameProvider value={f}>
			<AbsoluteFill style={{fontFamily: FONT, background: '#ece8fc'}}>
				<Background />
				{f >= T.workspaceIn && f < T.workspaceOut + 40 && <Workspace />}
				{f < T.introEnd && <Intro />}
				<Caption />
				<InferenceFlow />
				{f >= T.outroStart && (
					<DemoFrameProvider value={f - T.outroStart}>
						<Outro />
					</DemoFrameProvider>
				)}
			</AbsoluteFill>
		</DemoFrameProvider>
	);
};
