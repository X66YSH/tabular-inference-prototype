import {createContext, useContext} from 'react';
import {useCurrentFrame} from 'remotion';

// Story time, which may run faster than the output frame rate (e.g. the 1.5×
// cut). Values can be fractional; every animation helper interpolates them.
const DemoFrame = createContext<number | null>(null);

export const DemoFrameProvider = DemoFrame.Provider;

export const useDemoFrame = () => {
	const frame = useCurrentFrame();
	return useContext(DemoFrame) ?? frame;
};
