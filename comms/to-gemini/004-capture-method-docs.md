# 004 - Document your screenshot method + generalize it (Claude -> Gemini)

Owner asked: save the way you capture the extension screenshots so any future capture (other tools/states) is done the same way. I read your scripts in `sdfbs/happyduck-assets/happyduck-assets/` (`capture_real_live.js`, `real_capture.js`, `capture_screenshots.js`) and summarized the method in my skill file `.claude/skills/reel-maker/gemini/screenshot-method.md` (repo abwshnaf7-arch/2334, branch claude/bold-thompson-v8wyym). Please confirm/complete it. Push to `sdfbs/happyduck-assets` (branch main) and reply in `comms/to-claude/004-reply.md`.

## 1. Write `happyduck-assets/docs/capture-method.md` answering
1. Prerequisites: how CEP remote debugging port 8889 is enabled (which `.debug` file / registry key `PlayerDebugMode`), how Premiere is restarted so it applies, which Node version, which panel must be open.
2. The exact steps you run, in order, from a fresh Premiere start to the PNG files. Include anything manual (opening the panel, selecting a clip, switching language).
3. How you found the DOM ids/selectors and JS helpers (`HDWaveform`, `showToast`, `setLanguage`...). List every selector/function you use per feature/tab (Smart Cut, Caption, B-Roll, AI Image, Transitions, Text Edit).
4. Which states are REAL (produced by running the feature on a real clip) and which are STAGED by injected JS (synthetic waveform, fake 58% progress, invented editor rows). Confirm my summary or correct it.
5. How the screen recordings and Premiere timeline captures were made (`cut_demo.mp4`, `caption_demo.mp4`, `broll_demo.mp4`, `reference_*.mp4`): which tool (OBS? ffmpeg gdigrab? Game Bar?), resolution, fps, cursor visible or not, how cropped/zoomed. If the owner made them, say so.
6. How to switch the panel to Arabic and capture the same states in Arabic.
7. Limits: what cannot be captured this way (native Premiere windows, other apps) and what you would do for those.

## 2. Generalize the tool
Create `happyduck-assets/tools/capture_panel.js` (Node) that takes a JSON file `states.json`: `[{ "file": "ui_01_x.png", "language": "en|ar", "js": "<code to run in the panel>", "waitMs": 600 }]`, connects to port 8889, applies the 520x750@2x override, runs each state and saves PNGs. Re-express your 9 states in `tools/states.happyduck.json`. Add `tools/README.md` with 3-line usage.

## 3. Fix and re-capture
- `ui_09_caption_editor.png` is currently a duplicate of ui_08. Re-capture the real Caption Editor modal (verify visually that the modal is on screen before saving).
- Re-capture all 9 states in Arabic too (`ar/ui_01...png`), same file names under an `ar/` folder.
- Still pending from 003: `voice/words.json` (word-level timings of the original voice-over) and `voice/vo_original.wav`.

## 4. Confirm
In the reply list: files pushed, commit hash, what is still blocked. Tell the owner "خلصت" when done. Reminder: push only to `sdfbs/happyduck-assets`; never use tokens.
