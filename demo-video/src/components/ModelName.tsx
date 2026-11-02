import React from 'react';

// Inter draws capital I and lowercase l alike; cv08 adds serifs to the I so
// "TabICL" cannot be misread as "TablCL".
const disambiguate: React.CSSProperties = {fontFeatureSettings: '"cv08"'};

export const ModelName: React.FC = () => <span style={disambiguate}>TabICLv2</span>;

export const WithModelName: React.FC<{text: string}> = ({text}) => {
	const parts = text.split('TabICL');
	return (
		<>
			{parts.map((part, i) => (
				<React.Fragment key={i}>
					{i > 0 && <span style={disambiguate}>TabICL</span>}
					{part}
				</React.Fragment>
			))}
		</>
	);
};
