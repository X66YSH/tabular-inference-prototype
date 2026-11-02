import {Easing, interpolate} from 'remotion';

export type EasingFn = (t: number) => number;

// Smooth, unhurried in-out used for camera and cursor travel.
export const easeInOut: EasingFn = Easing.bezier(0.45, 0, 0.2, 1);
// Quick start, long settle; used for things arriving on screen.
export const easeOut: EasingFn = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn: EasingFn = Easing.bezier(0.5, 0, 0.75, 0);

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// 0→1 between start and start + dur.
export const prog = (frame: number, start: number, dur: number, easing: EasingFn = easeInOut) =>
	dur <= 0
		? frame >= start
			? 1
			: 0
		: interpolate(frame, [start, start + dur], [0, 1], {
				extrapolateLeft: 'clamp',
				extrapolateRight: 'clamp',
				easing,
			});

// 0→1→0 over [start, start + dur].
export const pulse = (frame: number, start: number, dur: number) => {
	const t = clamp01((frame - start) / dur);
	return Math.sin(Math.PI * t);
};

// Fades in over `fadeIn`, holds, fades out over `fadeOut` ending at `end`.
export const window01 = (frame: number, start: number, end: number, fadeIn = 10, fadeOut = 10) =>
	Math.min(prog(frame, start, fadeIn, easeOut), 1 - prog(frame, end - fadeOut, fadeOut, easeIn));

// Piecewise eased interpolation across [frame, value] keys. Equal neighbouring
// values make holds.
export function track(frame: number, keys: [number, number][], easing: EasingFn = easeInOut): number {
	if (frame <= keys[0][0]) return keys[0][1];
	for (let i = 0; i < keys.length - 1; i++) {
		const [f0, v0] = keys[i];
		const [f1, v1] = keys[i + 1];
		if (frame <= f1) return lerp(v0, v1, prog(frame, f0, f1 - f0, easing));
	}
	return keys[keys.length - 1][1];
}

export const mixHex = (a: string, b: string, t: number) => {
	const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
	const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
	const c = pa.map((v, i) => Math.round(lerp(v, pb[i], clamp01(t))));
	return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};

// ---------- Camera ----------

export type CameraKey = {f: number; cx: number; cy: number; z: number};
export type Camera = {cx: number; cy: number; z: number};

// Center moves linearly in eased time; zoom interpolates geometrically so
// push-ins feel even.
export function cameraAt(frame: number, keys: CameraKey[]): Camera {
	if (frame <= keys[0].f) return keys[0];
	for (let i = 0; i < keys.length - 1; i++) {
		const a = keys[i];
		const b = keys[i + 1];
		if (frame <= b.f) {
			const t = prog(frame, a.f, b.f - a.f, easeInOut);
			return {
				cx: lerp(a.cx, b.cx, t),
				cy: lerp(a.cy, b.cy, t),
				z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), t)),
			};
		}
	}
	return keys[keys.length - 1];
}

export const cameraTransform = ({cx, cy, z}: Camera, stageW = 1920, stageH = 1080) =>
	`translate(${stageW / 2 - cx * z}px, ${stageH / 2 - cy * z}px) scale(${z})`;

// ---------- Cursor ----------

export type CursorKey = {f: number; x: number; y: number};

// Moves between waypoints along a gentle arc, as a hand on a trackpad would.
export function cursorAt(frame: number, keys: CursorKey[]) {
	if (frame <= keys[0].f) return {x: keys[0].x, y: keys[0].y};
	for (let i = 0; i < keys.length - 1; i++) {
		const a = keys[i];
		const b = keys[i + 1];
		if (frame <= b.f) {
			const t = prog(frame, a.f, b.f - a.f, easeInOut);
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const bend = (i % 2 === 0 ? 1 : -1) * 0.12;
			const mx = (a.x + b.x) / 2 - dy * bend;
			const my = (a.y + b.y) / 2 + dx * bend;
			const u = 1 - t;
			return {
				x: u * u * a.x + 2 * u * t * mx + t * t * b.x,
				y: u * u * a.y + 2 * u * t * my + t * t * b.y,
			};
		}
	}
	const last = keys[keys.length - 1];
	return {x: last.x, y: last.y};
}

// Button "pressed" window around a click frame.
export const isPressed = (frame: number, click: number) => frame >= click - 3 && frame <= click + 4;
