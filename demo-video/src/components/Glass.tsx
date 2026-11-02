import React from 'react';
import {glassSurface} from '../styles/theme';

export const Glass: React.FC<{
	style?: React.CSSProperties;
	inner?: React.CSSProperties;
	radius?: number;
	children?: React.ReactNode;
}> = ({style, inner, radius = 24, children}) => (
	<div style={{position: 'relative', borderRadius: radius, ...glassSurface, ...style}}>
		{/* Specular sheen along the top edge, as in the add-in */}
		<div
			style={{
				position: 'absolute',
				inset: 0,
				borderRadius: radius,
				background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0) 90px)',
				pointerEvents: 'none',
			}}
		/>
		<div style={{position: 'relative', height: '100%', ...inner}}>{children}</div>
	</div>
);
