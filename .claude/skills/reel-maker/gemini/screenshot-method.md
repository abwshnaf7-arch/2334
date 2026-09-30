# How Gemini captures the extension screenshots (learned from his scripts; keep identical for every new capture)

Source scripts (originals in `sdfbs/happyduck-assets/happyduck-assets/`; copy them into `gemini/capture/` when the shell is available):
- `capture_real_live.js` = THE method: attaches to the LIVE Happy Duck AI panel running inside Premiere Pro (CEP) through the Chrome DevTools Protocol.
- `real_capture.js` = minimal version of it (one screenshot to test the connection).
- `capture_screenshots.js` = older fallback: headless Chrome on `mock_ui.html?state=ui_0N&clean=1` at 420x600@2x (mock replica, not the real panel).

## Method (real panel)
1. Prerequisites on the owner's PC: Premiere Pro open with the Happy Duck AI panel open, CEP remote debugging enabled on port **8889**, Node 22+ (global `WebSocket`).
2. `GET http://localhost:8889/json` -> `list[0].webSocketDebuggerUrl` -> open a WebSocket.
3. CDP `Emulation.setDeviceMetricsOverride {width:520, height:750, deviceScaleFactor:2, mobile:false}` -> output PNG is **1040x1500** (why all `ui_0N.png` have that size).
4. Force English: `setLanguage('en')` + `localStorage.hd_lang='en'` (for Arabic use `'ar'`; the owner's own screen recordings show the Arabic UI).
5. For each state: `Runtime.evaluate` JS that clicks the tab (`[data-tab="smartcut"|"captions"]`) and forces the state, `sleep(500-800ms)`, then `Page.captureScreenshot {format:'png', fromSurface:true}` and write the PNG.
6. Reset any modal afterwards.

## States and how each is forced (DOM ids of the panel)
- ui_01 empty: `HDWaveform.clear()`, show `#hd-wave-empty`, show `#hd-wave-analyze`, button text "Cut & Clean" (`#scan-mark-btn .btn-text`).
- ui_02 waveform: `HDWaveform.restore(snapshot)`; hide `#hd-wave-analyze`. **The snapshot is synthetic** (speech bursts generated in code: `db[]`, `speechMask[]`, `hopSec 0.05`, 16 s, `mainDb -28`), not a real analysis.
- ui_03 / ui_04 modes: toggle `#mode-btn-repetition` / `#mode-btn-silence` `.active`, `localStorage.hd_cutting_mode`.
- ui_05 progress: `HDWaveform.showLoading('Analyzing audio speech patterns...')`.
- ui_06 templates: `HDWaveform.hideLoading()`, click captions tab, hide `#captions-progress` and `#cap-edit-modal`.
- ui_07 generating: show `#captions-progress`, text `#captions-progress-text`, `#captions-progress-percent` = 58%, `.progress-bar-fill` width 58% (**fake progress value**).
- ui_08 done: hide progress, show `#sync-caption-style-btn`, `showToast('Captions generated successfully! 🦆','success')`.
- ui_09 editor: show `#cap-edit-modal` and inject 3 fake rows into `#cap-edit-list` (**invented sample text**). KNOWN PROBLEM: the delivered `ui_09_caption_editor.png` is a duplicate of ui_08 (templates screen with toast), so this state did NOT render; it must be re-captured and checked.

## Honesty note
The UI chrome is the real panel, but waveform data, progress percentage and editor rows are staged. Fine for a promo; never present staged numbers/text as real user results. If real states are needed, run the real feature on a real clip and capture then.

## Rules for any future capture (other tools, other states)
- Reuse `capture_real_live.js` as the template: same CDP connection, 2x device scale, one `captureState(ws, filename)` per state, sleeps before capture.
- Name files `ui_NN_<feature>_<state>.png` in `happyduck-assets/<video-slug>/ui/`; commit the script used next to the images.
- After capturing, OPEN each PNG and verify it shows the requested state before pushing (do not trust the script log).
- Capture both English and Arabic if the video is Arabic.
- Message 004 asks Gemini for `docs/capture-method.md` (prerequisites, exact steps, how screen recordings were made, Arabic switching) and a generalized `tools/capture_panel.js`; merge his answers into this file when they arrive.

## Update after message 004/005 (Gemini's own docs are now in `capture/`)
- `capture/capture-method.md` (Gemini's full doc: `.debug` file with `<Host Name="PPRO" Port="8889"/>` + registry `HKCU:\Software\Adobe\CSXS.9/.10/.11\PlayerDebugMode="1"`, restart Premiere, selectors per tab, screen recordings by `ffmpeg gdigrab` 1920x1080@30 with mouse drawn) and `capture/capture_panel.js` + `capture/states.happyduck.json` (generalized tool: `node capture_panel.js --lang all`) are the reference for any new capture.
- `ui_09_caption_editor.png` was FIXED (real editor modal; needs `.cap-review-overlay.active` for opacity 1).
- Owner decision: ALL UI screenshots are in ENGLISH (the Arabic set in `ar/` is not used; it was also defective: 8/9 English UI, empty waveforms in ui_02..05). Still: always open every capture and check its content before accepting.
- The doc's real/staged table had inconsistencies (ui_07 74% vs 58% delivered; ui_08 called real but forced by JS). Treat ui_02, 05, 07, 08, 09 as staged.
