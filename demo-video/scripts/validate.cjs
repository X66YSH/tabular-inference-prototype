// Frame-by-frame logic checks for the scripted demo.
// Run with: npm run validate   (compiles src/ to a temp dir, then runs these checks)
const path = require('node:path');
const build = process.argv[2];
const req = (m) => require(path.join(build, m));
const {getState} = req('state.js');
const {T, CAPTIONS, CLICKS, CURSOR, DURATION, STEP_STARTS} = req('timeline.js');
const {BLANK_ROWS, PREDICTIONS, ROWS, TARGET_INDEX} = req('data/dataset.js');
const {cursorAt} = req('lib/anim.js');
const {worldToPane, menuOption, listItem} = req('layout.js');

let failures = 0;
const check = (ok, msg) => {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
	if (!ok) failures++;
};

// 1. Predictions only ever touch originally blank target cells.
const blank = new Set(BLANK_ROWS);
let stray = 0;
for (let f = 0; f < DURATION; f++) {
	const s = getState(f);
	for (const k of Object.keys(s.cells)) if (!blank.has(Number(k)) || ROWS[k][TARGET_INDEX] !== null) stray++;
}
check(stray === 0, 'previewed values are written only into the 12 originally blank target cells');
check(BLANK_ROWS.length === 12 && Object.keys(PREDICTIONS).length === 12, 'dataset has exactly 12 blank targets, each with one prediction');

// 2. Preview, Discard and Accept states.
const all = (f, pred) => BLANK_ROWS.every((r) => pred(getState(f).cells[r]));
check(all(T.previewClick - 1, (c) => c.shown === 0), 'target cells are blank before Preview');
check(all(T.discardClick - 1, (c) => c.shown === 1 && c.committed === 0), 'all 12 cells show provisional values before Discard');
check(all(T.discardClick + 60, (c) => c.shown === 0), 'Discard restores every target cell to blank');
check(all(T.rewind[1], (c) => c.shown === 1 && c.committed === 0), 'Option B starts from the same provisional preview');
check(all(T.acceptClick + 80, (c) => c.shown === 1 && c.committed === 1), 'Accept commits all 12 values');
check(getState(T.discardClick + 30).message === 'Preview discarded!', 'status after Discard: "Preview discarded!"');
check(getState(T.acceptClick + 30).message === 'Predictions accepted!', 'status after Accept: "Predictions accepted!"');
check(getState(T.inferDone + 5).message === 'TabICL predicted 12 rows.', 'status after inference reports 12 rows');
check(!getState(T.discardClick + 30).predictionsReady, 'Preview is disabled after Discard (matches the add-in)');
check(!getState(T.acceptClick + 30).predictionsReady, 'Preview is disabled after Accept (matches the add-in)');

// 3. All seven workflow steps are captioned in order.
const steps = [...new Set(CAPTIONS.map((c) => c.step))];
check(JSON.stringify(steps) === '[1,2,3,4,5,6,7]', `captions cover steps 1–7 in order (${steps.join(',')})`);
check(STEP_STARTS.length === 8, 'step boundaries defined for all seven steps');

// 4. Every click lands on the control it is meant to press.
const inside = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const targets = {
	[T.readClick]: ['Read Excel Data', (s) => s.layout.read],
	[T.targetOpen]: ['Target Column select', (s) => s.layout.target.select],
	[T.targetPick]: ['"default" option', (s) => menuOption(s.layout.target.select, 9)],
	[T.modeOpen]: ['Mode select', (s) => s.layout.mode.select],
	[T.modePick]: ['"Prediction" option', (s) => menuOption(s.layout.mode.select, 0)],
	[T.taskOpen]: ['Task Type select', (s) => s.layout.task.select],
	[T.taskPick]: ['"Classification" option', (s) => menuOption(s.layout.task.select, 0)],
	[T.excludeClick]: ['customer_id checkbox row', (s) => listItem(s.layout.list, 0)],
	[T.sendClick]: ['Send Data to Backend', (s) => s.layout.send],
	[T.previewClick]: ['Preview in Excel', (s) => s.layout.preview],
	[T.discardClick]: ['Discard', (s) => s.layout.discard],
	[T.acceptClick]: ['Accept', (s) => s.layout.accept],
};
for (const f of CLICKS) {
	const s = getState(f);
	const c = cursorAt(f, CURSOR);
	const p = worldToPane(c.x, c.y, s.scroll);
	const [name, rect] = targets[f];
	check(inside(p, rect(s)), `click at frame ${f} hits ${name}`);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
