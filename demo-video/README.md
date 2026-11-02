# Tabular AI for Excel: demo video

A standalone [Remotion](https://www.remotion.dev/) project that renders a 73-second,
silent, 1920×1080 H.264 product demo of the Tabular AI Excel add-in.

This is a **scripted visual reconstruction** of the add-in's workflow. Excel, the
add-in and the predictions are React components driven frame by frame. Nothing calls
the real backend or TabICLv2, and all data is synthetic. The add-in, backend and model
code in this repository are not touched.

## Quick start

```bash
cd demo-video
npm install            # once
npm run dev            # Remotion Studio: scrub and preview in the browser
npm run render         # → out/tabular-ai-demo.mp4  (H.264, 30 fps, no audio)
npm run poster         # → out/tabular-ai-demo-poster.png (frame 1720: preview in place, Accept / Discard visible)
npm run validate       # logic checks (see below)
```

Rendering takes several minutes. On low-memory machines, add `-- --concurrency=2`.

## Storyboard (30 fps)

| Time | Frames | Scene |
|---|---|---|
| 0–5 s | 0–150 | Intro: "Tabular AI / Predictive AI. Inside Excel." |
| 5–11 s | 150–330 | Step 1: open the workbook (12 blank `default` cells highlighted) |
| 11–17 s | 330–510 | Step 2: Read Excel Data |
| 17–29 s | 510–870 | Step 3: Target = default, Mode = Prediction, Task = Classification |
| 29–34 s | 870–1020 | Step 4: exclude `customer_id` |
| 34–43 s | 1020–1290 | Step 5: Send Data to Backend → "TabICL predicted 12 rows." |
| 43–58 s | 1290–1740 | Step 6: Preview in Excel; values fill the original cells in gray |
| 58–68 s | 1740–2030 | Step 7: Option A, Discard; Option B, Accept |
| 68–73 s | 2040–2190 | Closing frame |

Step 7 presents Discard and Accept as **two alternatives from the same preview**. In
the add-in, Discard also clears the predictions, so previewing again would need a new
backend run. The video does not show a "Preview again after Discard" action that
the app doesn't have.

## Where to change things

| What | File |
|---|---|
| All timing: event frames, camera keys, cursor waypoints, captions | `src/timeline.ts` |
| Synthetic dataset and the 12 scripted predictions | `src/data/dataset.ts` |
| Geometry: Excel window, columns, task-pane layout (mirrors `App.css`) | `src/layout.ts` |
| Frame → UI state (messages, enabled/disabled, cell states) | `src/state.ts` |
| Excel chrome / grid / task pane / cursor / captions | `src/components/` |
| Intro, workspace and outro scenes | `src/scenes/` |
| Colors and fonts (copied from the add-in's CSS tokens) | `src/styles/theme.ts` |

To retime a step, move its event frames in `T`. Then shift the matching `CAMERA`,
`CURSOR` and `CAPTIONS` entries by the same amount, and update `DURATION` if the
total length changes. Cursor targets come from the pane layout, so they follow
the controls automatically. Run `npm run validate` afterwards: it fails if any click
misses its control.

## Validation

`npm run validate` checks the scripted logic frame by frame:

- previewed values only ever appear in the 12 originally blank `default` cells
- Discard returns every one of those cells to blank; Accept commits all 12
- status messages match the add-in's real strings at each stage
- Preview is disabled after Discard and after Accept, as in `App.jsx`
- captions cover all seven workflow steps in order
- each of the 12 cursor clicks lands inside the control it is meant to press

The dataset module also throws at load time if the 12-blank or prediction-coverage
invariant is broken.

## Content notes

- Data is fabricated (`C-1001`…`C-1036`) and is not drawn from any real customer.
- The predicted 0/1 values are illustrative and are not TabICLv2 output.
- No accuracy, speed, cost or business-impact figures are shown.
- No BMO or Microsoft logos are used. The Excel window is generic, logo-free chrome.
- Font: Inter (SIL Open Font License 1.1), bundled in `public/fonts/` with its license.
