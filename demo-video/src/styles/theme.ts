// Tokens lifted from excel-addin/src/App.css so the video matches the add-in.
export const C = {
	ink: '#1f2547',
	inkSoft: '#565d8c',
	inkFaint: '#8a8fb4',
	accent: '#5b6cf0',
	accent2: '#8f6bf2',
	edge: 'rgba(98, 104, 186, 0.16)',
	hairline: 'rgba(255, 255, 255, 0.72)',
	// Excel
	excelGreen: '#217346',
	excelGreenDark: '#185c37',
	excelSelect: '#107c41',
	gridLine: '#e1e1e1',
	headerBg: '#f5f5f5',
	headerLine: '#d0d0d0',
	cellInk: '#1f1f1f',
	provisional: '#888888', // the add-in's preview font colour
};

export const FONT = "Inter, -apple-system, 'Segoe UI', system-ui, sans-serif";

export const TITLE_GRADIENT = 'linear-gradient(100deg, #3346c8 0%, #6a55e6 60%, #9a63e8 100%)';
export const BUTTON_GRADIENT = 'linear-gradient(120deg, #4f7bf7 0%, #6a63f0 50%, #8d68ee 100%)';
export const DOT_GRADIENT = 'linear-gradient(135deg, #5a7cf6, #9a68ee)';

export const glassSurface = {
	background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.72), rgba(250, 248, 255, 0.5))',
	backdropFilter: 'blur(24px) saturate(180%)',
	WebkitBackdropFilter: 'blur(24px) saturate(180%)',
	border: '1px solid rgba(255, 255, 255, 0.8)',
	boxShadow:
		'0 30px 60px -30px rgba(64, 60, 150, 0.45), 0 2px 8px -2px rgba(64, 60, 150, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(150, 140, 230, 0.12)',
} as const;
