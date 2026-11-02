import React from 'react';
import {Composition} from 'remotion';
import {DemoVideo} from './DemoVideo';
import './lib/fonts';
import {DURATION, FPS} from './timeline';

const FAST = 1.5;

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="TabularAIDemo" component={DemoVideo} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
		<Composition
			id="TabularAIDemo15x"
			component={DemoVideo}
			defaultProps={{speed: FAST}}
			durationInFrames={Math.ceil(DURATION / FAST)}
			fps={FPS}
			width={1920}
			height={1080}
		/>
	</>
);
