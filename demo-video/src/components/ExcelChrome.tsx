import React from 'react';
import {CHROME, WIN} from '../layout';
import {C, FONT} from '../styles/theme';

// Generic, logo-free Excel window chrome. Icons are simple line glyphs.

const G = '#5b5b5b';
const line = {fill: 'none', stroke: G, strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;

const Icon: React.FC<{d: string; size?: number; color?: string}> = ({d, size = 20, color}) => (
	<svg width={size} height={size} viewBox="0 0 20 20">
		<path d={d} {...line} stroke={color ?? G} />
	</svg>
);

const Box: React.FC<{w: number; text: string}> = ({w, text}) => (
	<div
		style={{
			width: w,
			height: 24,
			border: '1px solid #c8c8c8',
			borderRadius: 4,
			background: '#fff',
			fontSize: 13,
			color: '#333',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: '0 6px 0 8px',
		}}
	>
		{text}
		<Icon d="M6 8l4 4 4-4" size={12} />
	</div>
);

const Group: React.FC<{label: string; children: React.ReactNode}> = ({label, children}) => (
	<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 14px', borderRight: '1px solid #e3e3e3', height: 56}}>
		<div style={{display: 'flex', alignItems: 'center', gap: 8, height: 38}}>{children}</div>
		<div style={{fontSize: 11, color: '#6b6b6b', lineHeight: '14px'}}>{label}</div>
	</div>
);

const Letter: React.FC<{c: string; style?: React.CSSProperties}> = ({c, style}) => (
	<div style={{width: 20, textAlign: 'center', fontSize: 15, color: '#333', ...style}}>{c}</div>
);

const TitleBar: React.FC = () => (
	<div
		style={{
			height: CHROME.title,
			background: C.excelGreen,
			display: 'flex',
			alignItems: 'center',
			padding: '0 16px',
			color: 'white',
			fontSize: 14,
			position: 'relative',
		}}
	>
		<div style={{display: 'flex', alignItems: 'center', gap: 10, opacity: 0.95}}>
			<span>AutoSave</span>
			<div style={{width: 34, height: 18, borderRadius: 9, border: '1.5px solid rgba(255,255,255,0.85)', position: 'relative'}}>
				<div style={{position: 'absolute', left: 3, top: 2.5, width: 10, height: 10, borderRadius: 5, background: 'white'}} />
			</div>
			<span style={{fontSize: 12, opacity: 0.85}}>Off</span>
			<Icon d="M4 4h10l2 2v10H4zM7 4v4h6V4M7 16v-5h6v5" color="white" size={18} />
			<Icon d="M8 6L4 10l4 4M4 10h8a4 4 0 010 8" color="white" size={18} />
		</div>
		<div style={{position: 'absolute', left: 0, right: 0, textAlign: 'center', fontWeight: 500, letterSpacing: '0.01em', pointerEvents: 'none'}}>
			corporate_credit_demo.xlsx
		</div>
		<div
			style={{
				marginLeft: 'auto',
				marginRight: 40,
				width: 360,
				height: 26,
				borderRadius: 6,
				background: 'rgba(255,255,255,0.18)',
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				padding: '0 10px',
				fontSize: 13,
				color: 'rgba(255,255,255,0.85)',
			}}
		>
			<Icon d="M8.5 3.5a5 5 0 100 10 5 5 0 000-10zM12.2 12.2L16.5 16.5" color="white" size={14} />
			Search
		</div>
		<div style={{display: 'flex', gap: 26, alignItems: 'center'}}>
			<Icon d="M5 10h10" color="white" size={16} />
			<Icon d="M5 5h10v10H5z" color="white" size={16} />
			<Icon d="M5 5l10 10M15 5L5 15" color="white" size={16} />
		</div>
	</div>
);

const Tabs: React.FC = () => (
	<div
		style={{
			height: CHROME.tabs,
			background: '#f3f3f3',
			display: 'flex',
			alignItems: 'flex-end',
			gap: 4,
			padding: '0 12px',
			fontSize: 14,
			color: '#3b3b3b',
		}}
	>
		{['File', 'Home', 'Insert', 'Draw', 'Page Layout', 'Formulas', 'Data', 'Review', 'View', 'Help'].map((t) => (
			<div
				key={t}
				style={{
					padding: '0 12px 8px',
					position: 'relative',
					fontWeight: t === 'Home' ? 600 : 400,
					color: t === 'Home' ? C.excelGreenDark : '#3b3b3b',
				}}
			>
				{t}
				{t === 'Home' && (
					<div style={{position: 'absolute', left: 10, right: 10, bottom: 2, height: 3, borderRadius: 2, background: C.excelGreen}} />
				)}
			</div>
		))}
	</div>
);

const Ribbon: React.FC = () => (
	<div
		style={{
			height: CHROME.ribbon,
			background: '#f3f3f3',
			padding: '0 8px 6px',
		}}
	>
		<div
			style={{
				height: 58,
				background: '#fff',
				borderRadius: 8,
				border: '1px solid #e6e6e6',
				display: 'flex',
				alignItems: 'center',
				overflow: 'hidden',
			}}
		>
			<Group label="Clipboard">
				<Icon size={26} d="M6 4h8v3H6zM5 5H3.5v12.5h13V5H15M7 11h6M7 14h4" />
				<Icon d="M5 15a2 2 0 104 0 2 2 0 00-4 0M11 15a2 2 0 104 0 2 2 0 00-4 0M7 13L13 4M13 13L7 4" />
			</Group>
			<Group label="Font">
				<Box w={128} text="Aptos Narrow" />
				<Box w={46} text="11" />
				<Letter c="B" style={{fontWeight: 800}} />
				<Letter c="I" style={{fontStyle: 'italic', fontFamily: 'Georgia, serif'}} />
				<Letter c="U" style={{textDecoration: 'underline'}} />
				<Icon d="M3 3h14v14H3zM3 10h14M10 3v14" />
				<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
					<Icon size={16} d="M4 13l5-9 5 9M6 10h6" />
					<div style={{width: 16, height: 3, background: '#e8c33a'}} />
				</div>
				<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
					<Letter c="A" style={{fontSize: 14, lineHeight: '16px'}} />
					<div style={{width: 16, height: 3, background: '#d13438'}} />
				</div>
			</Group>
			<Group label="Alignment">
				<Icon d="M3 5h14M3 9h9M3 13h14M3 17h9" />
				<Icon d="M3 5h14M6 9h8M3 13h14M6 17h8" />
				<Icon d="M3 5h14M8 9h9M3 13h14M8 17h9" />
				<Icon d="M3 5h14M3 10h11a2.5 2.5 0 010 5h-3M12 13l-2 2 2 2M3 15h5" />
				<Icon d="M3 4h14v12H3zM7 10h6M7 10l2-2M7 10l2 2M13 10l-2-2M13 10l-2 2" />
			</Group>
			<Group label="Number">
				<Box w={104} text="General" />
				<Letter c="$" />
				<Letter c="%" />
				<Letter c="," style={{fontWeight: 700}} />
			</Group>
			<Group label="Styles">
				<Icon size={24} d="M3 3h14v14H3zM3 8h14M3 13h14M8 3v14" />
				<Icon size={24} d="M3 3h14v14H3zM3 7h14M8 7v10M13 7v10M3 12h14" />
				<Icon size={24} d="M3 5h14v10H3zM6 8h8M6 12h5" />
			</Group>
			<Group label="Cells">
				<Icon size={24} d="M3 5h14v10H3zM10 5v10M7 10h6M10 7v6" />
				<Icon size={24} d="M3 5h14v10H3zM7 8l6 4M13 8l-6 4" />
				<Icon size={24} d="M3 5h14v10H3zM3 10h14M10 5v10" />
			</Group>
			<Group label="Editing">
				<Letter c="Σ" style={{fontSize: 18}} />
				<Icon size={22} d="M6 4v12M3 13l3 3 3-3M12 4h5M12 9h4M12 14h3" />
				<Icon size={22} d="M8.5 3.5a5 5 0 100 10 5 5 0 000-10zM12.2 12.2L16.5 16.5" />
			</Group>
		</div>
	</div>
);

const FormulaBar: React.FC<{nameBox: string; content: string}> = ({nameBox, content}) => (
	<div
		style={{
			height: CHROME.formula,
			background: '#f3f3f3',
			display: 'flex',
			alignItems: 'center',
			gap: 8,
			padding: '0 8px',
		}}
	>
		<div
			style={{
				width: 96,
				height: 26,
				border: '1px solid #c8c8c8',
				background: '#fff',
				borderRadius: 4,
				fontSize: 14,
				display: 'flex',
				alignItems: 'center',
				padding: '0 8px',
				color: '#222',
				justifyContent: 'space-between',
			}}
		>
			{nameBox}
			<Icon d="M6 8l4 4 4-4" size={12} />
		</div>
		<div style={{color: '#9a9a9a', fontSize: 16, padding: '0 4px'}}>⋮</div>
		<Icon d="M6 6l8 8M14 6l-8 8" size={16} color="#9a9a9a" />
		<Icon d="M4 10.5l4 4 8-9" size={16} color="#9a9a9a" />
		<div style={{fontStyle: 'italic', fontFamily: 'Georgia, serif', fontSize: 16, color: '#444', padding: '0 6px'}}>fx</div>
		<div
			style={{
				flex: 1,
				height: 26,
				border: '1px solid #d6d6d6',
				background: '#fff',
				borderRadius: 4,
				fontSize: 14,
				display: 'flex',
				alignItems: 'center',
				padding: '0 10px',
				color: '#222',
			}}
		>
			{content}
		</div>
	</div>
);

const SheetTabs: React.FC = () => (
	<div
		style={{
			position: 'absolute',
			left: 0,
			right: 0,
			top: WIN.h - CHROME.status - CHROME.sheetTabs,
			height: CHROME.sheetTabs,
			background: '#f3f3f3',
			borderTop: '1px solid #d6d6d6',
			display: 'flex',
			alignItems: 'stretch',
			fontSize: 13,
			color: '#444',
		}}
	>
		<div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', color: '#9a9a9a'}}>
			<span>◀</span>
			<span>▶</span>
		</div>
		<div
			style={{
				background: '#fff',
				padding: '0 18px',
				display: 'flex',
				alignItems: 'center',
				color: C.excelGreenDark,
				fontWeight: 600,
				borderBottom: `3px solid ${C.excelGreen}`,
				boxShadow: '1px 0 0 #d6d6d6, -1px 0 0 #d6d6d6',
			}}
		>
			Credit_Sample
		</div>
		<div style={{display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 18, color: '#666'}}>⊕</div>
	</div>
);

const StatusBar: React.FC = () => (
	<div
		style={{
			position: 'absolute',
			left: 0,
			right: 0,
			bottom: 0,
			height: CHROME.status,
			background: '#f3f3f3',
			borderTop: '1px solid #e0e0e0',
			display: 'flex',
			alignItems: 'center',
			padding: '0 16px',
			fontSize: 13,
			color: '#555',
		}}
	>
		<span>Ready</span>
		<span style={{marginLeft: 24, color: '#777'}}>Accessibility: Good to go</span>
		<div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16}}>
			<Icon size={16} d="M3 4h14v12H3zM3 8h14M8 4v12" />
			<Icon size={16} d="M5 3h10v14H5zM5 7h10" />
			<Icon size={16} d="M3 4h14v12H3zM10 4v12" />
			<span style={{color: '#777'}}>—</span>
			<div style={{width: 120, height: 2, background: '#bdbdbd', position: 'relative'}}>
				<div style={{position: 'absolute', left: 58, top: -6, width: 4, height: 14, background: '#555', borderRadius: 1}} />
			</div>
			<span style={{color: '#777'}}>+</span>
			<span>100%</span>
		</div>
	</div>
);

type Props = {grid: React.ReactNode; pane: React.ReactNode; nameBox: string; formula: string};

export const ExcelWindow: React.FC<Props> = ({grid, pane, nameBox, formula}) => (
	<div
		style={{
			position: 'absolute',
			left: WIN.x,
			top: WIN.y,
			width: WIN.w,
			height: WIN.h,
			borderRadius: 14,
			overflow: 'hidden',
			background: '#fff',
			fontFamily: FONT,
			boxShadow:
				'0 60px 120px -40px rgba(50, 46, 140, 0.45), 0 24px 48px -24px rgba(50, 46, 140, 0.3), 0 0 0 1px rgba(80, 80, 140, 0.12)',
		}}
	>
		<TitleBar />
		<Tabs />
		<Ribbon />
		<FormulaBar nameBox={nameBox} content={formula} />
		{grid}
		<SheetTabs />
		<StatusBar />
		{pane}
	</div>
);
