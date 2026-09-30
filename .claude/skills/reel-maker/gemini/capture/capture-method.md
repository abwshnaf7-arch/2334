# CEP Extension Screenshot Capture Methodology & Architecture

This document details the exact methodology used to capture pixel-perfect, 2x high-resolution screenshots from the live Happy Duck AI Adobe Premiere Pro CEP extension panel.

---

## 1. Prerequisites & Debug Configuration

### A. Adobe CEP Remote Debugging Configuration
Adobe Premiere Pro CEP panels run on an embedded Chromium CEF (Chromium Embedded Framework) instance. Remote debugging is enabled through two settings:

1. **The `.debug` file in the extension root**:
   Path: `C:\Users\<user>\AppData\Roaming\Adobe\CEP\extensions\HappyDuckAI\.debug`
   Content:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <ExtensionList>
     <Extension Id="com.happyduckai.extension">
       <HostList>
         <Host Name="PPRO" Port="8889"/>
       </HostList>
     </Extension>
   </ExtensionList>
   ```
2. **Adobe PlayerDebugMode in Windows Registry**:
   Set `PlayerDebugMode` to `"1"` for all relevant CSXS versions in Registry:
   - `HKCU:\Software\Adobe\CSXS.11\PlayerDebugMode` = `"1"`
   - `HKCU:\Software\Adobe\CSXS.10\PlayerDebugMode` = `"1"`
   - `HKCU:\Software\Adobe\CSXS.9\PlayerDebugMode`  = `"1"`

### B. Restart Requirement
Premiere Pro must be restarted after writing `.debug` or setting registry keys so the Chromium debugging server binds to `localhost:8889`.

### C. Panel State
The Happy Duck AI extension panel must be opened at least once in Premiere Pro (`Window` → `Extensions` → `Happy Duck AI`). Once opened, Chromium serves its DevTools HTTP/WebSocket endpoint at:
`http://localhost:8889/json`

### D. Node.js Environment
Requires Node.js v18+ (or Node v22+ which includes native global `WebSocket`). No heavy dependencies needed.

---

## 2. The Execution Workflow (Fresh Premiere to PNGs)

1. **Launch Premiere Pro**: Ensure the Happy Duck AI panel is visible in workspace.
2. **Discover Debugger WebSocket**:
   `GET http://localhost:8889/json` returns an array of inspectable pages. Target `webSocketDebuggerUrl`.
3. **Connect WebSocket & Emulate Viewport**:
   Through Chrome DevTools Protocol (CDP):
   ```js
   await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
     width: 520,
     height: 750,
     deviceScaleFactor: 2, // Generates 1040x1500 px retina images
     mobile: false
   });
   ```
4. **Iterate States & Capture**:
   For each state in `states.happyduck.json`:
   - Trigger the tab or component via `document.querySelector('[data-tab="..."]').click()`.
   - Configure DOM state or call in-page runtime functions via `Runtime.evaluate`.
   - Wait 400-600ms for CSS transitions and canvas rendering.
   - Capture via `Page.captureScreenshot` (`fromSurface: true`).
   - Save Buffer directly to disk as PNG.

---

## 3. DOM Selectors & JS Helpers Reference

### Core Navigation
- Tabs: `[data-tab="smartcut"]`, `[data-tab="captions"]`, `[data-tab="broll"]`, `[data-tab="aigen"]`, `[data-tab="textedit"]`, `[data-tab="transitions"]`
- Language Switcher: `setLanguage('en')` or `setLanguage('ar')`, backed by `localStorage.setItem('hd_lang', ...)`

### Smart Cut Tab
- Empty state container: `#hd-wave-empty`
- Analyze CTA button: `#hd-wave-analyze`
- Cut CTA button: `#scan-mark-btn`
- Mode buttons: `[data-mode="silence"]`, `[data-mode="repetition"]`
- Options boxes: `#sil-options`, `#rep-options`
- Progress box: `#smartcut-progress-box` (`.sc-prog-fill`, `.sc-prog-pct`, `.sc-prog-stage`, `.sc-prog-detail`)
- Waveform runtime object: `window.HDWaveform`
  - Clear: `window.HDWaveform.clear()`
  - Load data: `window.HDWaveform.loadSnapshot(waveData)`
  - Threshold line: `window.HDWaveform.setThreshold(-28)`

### Captions Tab
- Style Gallery: `#caption-templates-gallery`
- Progress box: `#captions-progress-box` (`.cap-prog-fill`, `.cap-prog-pct`, `.cap-prog-text`)
- Action buttons: `#create-captions-btn`, `#edit-captions-btn`
- Editor Modal: `#cap-edit-modal` (MUST have classes `.cap-review-overlay` and `.active` for `opacity: 1`)
- Editor elements: `#cap-edit-title`, `#cap-edit-refresh-btn`, `#cap-edit-list`, `#cap-edit-apply`, `#cap-edit-cancel`

---

## 4. Real vs. Staged States Accounting

Honest disclosure of how screenshots are rendered:

| State | Status | Mechanism |
|---|---|---|
| `ui_01_smartcut_empty` | **100% Real DOM** | Natural empty state of the panel. |
| `ui_02_smartcut_waveform` | **Hybrid** | Real canvas rendering engine (`HDWaveform.loadSnapshot`) driven by realistic voice speech bursts (-19dB speech, -48dB silence) with real threshold line. |
| `ui_03_smartcut_repetition_mode` | **100% Real DOM** | Real mode button click triggering genuine extension options panel. |
| `ui_04_smartcut_silence_mode` | **100% Real DOM** | Real sliders and sensitivity settings. |
| `ui_05_smartcut_progress` | **Real UI / Staged Progress** | Real progress element unhidden with realistic 58% snapshot to freeze the animation for photography. |
| `ui_06_caption_templates` | **100% Real DOM** | Live templates gallery with all preset cards and color tokens. |
| `ui_07_caption_generating` | **Real UI / Staged Progress** | Real progress element unhidden with 74% snapshot. |
| `ui_08_caption_done_edit_button` | **100% Real DOM** | Live post-generation state with Edit button. |
| `ui_09_caption_editor` | **Real UI / Staged Content** | Real modal structure with active overlay, populated with the real promotional dialogue rows for the video. |

---

## 5. Screen Recordings & Timeline Video Capture

- **Tool**: Captured directly on Windows using `ffmpeg.exe` with `gdigrab` (`-f gdigrab -framerate 30 -draw_mouse 1 -i desktop`).
- **Resolution**: Native 1920x1080 @ 30fps.
- **Recordings (`cut_demo.mp4`, `caption_demo.mp4`)**:
  Real screen recordings made while operating Premiere Pro with an actual speaker video clip on track A1/V1, executing the cut and ripple deletion live on the timeline.

---

## 6. Language Switching

The extension is bilingual (Arabic & English). Language switching is handled in `main.js`:
- Setting `localStorage.setItem('hd_lang', 'en')` or `'ar'`
- Invoking `window.setLanguage('en')` or `window.setLanguage('ar')`
- The entire UI updates synchronously via `data-i18n` attribute translations and flips `dir="ltr"` or `dir="rtl"`.

---

## 7. Limitations & Workarounds

- **Native Premiere Pro Windows**: CEP CDP debugger connects only to the HTML/CEF window (`localhost:8889`). Native OS popups (e.g. File Open Dialog, Premiere workspace menus) cannot be captured via CDP.
- **Workaround for Native Timeline/Workspace**: Use FFmpeg `gdigrab` or Windows Desktop Duplication API to record full screen Premiere Pro interactions.
