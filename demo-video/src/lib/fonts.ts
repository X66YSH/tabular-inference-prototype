import {continueRender, delayRender, staticFile} from 'remotion';

// Inter (SIL OFL 1.1), bundled locally so renders never depend on the network.
const handle = delayRender('Loading Inter');
const face = new FontFace('Inter', `url(${staticFile('fonts/Inter-Variable.woff2')}) format('woff2')`, {
	weight: '100 900',
});

face
	.load()
	.then((loaded) => {
		document.fonts.add(loaded);
		continueRender(handle);
	})
	.catch((err) => {
		console.error('Inter failed to load; falling back to system fonts.', err);
		continueRender(handle);
	});
