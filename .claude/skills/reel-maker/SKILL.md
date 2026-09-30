---
name: reel-maker
description: Build a vertical (9:16) promo/UGC reel for a SaaS or plugin from a voice-over, real product screenshots and screen recordings, in code (HTML/canvas frames -> ffmpeg MP4), including the whole workflow with the owner and Gemini. Use when the owner gives a voice-over or script and asks for a reel / UGC / product video / "اعمل ريل / فيديو شرح / مونتاج", asks how to make a new video with this system, or says Gemini forgot how to communicate / needs to be briefed. Visual-first motion graphics, Egyptian-Arabic karaoke captions, generated music with ducking.
---

# reel-maker: one skill for the whole reel workflow (Happy Duck AI reel, reusable)

Reply to the owner in short Egyptian Arabic, no jargon. The owner is not technical and wants to be OUT of the loop (no relaying, no commands).

## START HERE: route the request
| Owner says | Do |
|---|---|
| "عايز ريل/فيديو جديد" | Follow **New video checklist** below. |
| "ازاي أعمل فيديو جديد / الخطوات؟" | Give them `owner-guide-ar.md` (paraphrase, keep it short). |
| "جيميناي نسي / مش عارف يتواصل / اديله التفاصيل" | Read `CHANNEL.md`, fill `gemini/onboarding-message.md` (current request + summary), give it to the owner to paste ONCE. Also write/refresh the numbered request in `comms/to-gemini/`. |
| "كمل" (after Gemini finished) | `git -C /home/user/assets-repo pull` (clone first if missing), read `comms/to-claude/*-reply.md`, verify assets by LOOKING at them, continue the build. |
| Feedback with a screenshot | Fix that scene only (see scene rules), re-render only the affected frames, re-encode, send. |

Files in this skill: `gemini/screenshot-method.md` (HOW Gemini captures UI screenshots: Chrome DevTools Protocol on the live Premiere panel, port 8889, 1040x1500 PNG, states forced by injected JS; any new capture must use the same method), `CHANNEL.md` (Claude<->Gemini facts/troubleshooting), `gemini/onboarding-message.md`, `gemini/asset-request-template.md`, `owner-guide-ar.md`, `brief-template.md`, `engine/` (the code).

## The two design rules the owner insisted on
1. **Show, don't tell.** Every idea is a visual scene (motion graphics of the real timeline/UI, icons, metaphors, before/after). On-screen text = the karaoke caption + tiny labels only. A scene that reads like a slide gets redone.
2. **ONE hero per beat.** Each phrase/beat has a single large centered hero; the previous hero fully fades out (`beat(t,a,b)`) before the next fades in. Never stack 3+ animated things. Keep the same hero across related beats (one timeline: silences -> repeats -> captions). No decorative wipes, no leftover elements from earlier beats (every created element must be hidden outside its beat; check stills at beat boundaries).

## New video checklist
1. **Brief**: fill `brief-template.md`, asking the owner only what is missing (propose defaults). Write the script in Egyptian Arabic (hook = problem first; "إنت مدير" framing worked; years as words for TTS) plus a TTS voice description (young Cairene male, friendly, confident, medium-fast).
2. **Script phrases**: put the final script in `engine/phrases.py` (`PHRASES`, phrases separated by `|`, one line per sentence) and in `comms/SCRIPT.md`.
3. **Ask Gemini for real assets** (you cannot see the owner's PC): write `comms/to-gemini/NNN-<topic>.md` from `gemini/asset-request-template.md` (exact file names, states, facts to verify), commit + push to `claude/bold-thompson-v8wyym`, tell the owner what to forward to Gemini (first time or if forgotten: filled `gemini/onboarding-message.md`).
4. **Owner generates the voice-over WAV** and uploads it in the chat (path appears under `/root/.claude/uploads/...`).
5. On "كمل": pull Gemini's repo, **look at every asset** (Read PNGs, extract video frames) because names/descriptions can be wrong (a "Caption Editor" file was a duplicate of another screen; a "reference_reel3_final.mp4" was listed but missing). Note what is missing and work around it honestly.
6. **Build**: copy `engine/` to a work dir (e.g. `reel/`), put assets in `assets/`, extract clip frames into `clips/<name>/%04d.jpg` (ffmpeg fps=30, scale=960), adapt `scenes.js` scenes to the new product/script (reuse components), run `./build.sh <vo.wav> [speed] [out.mp4]`.
7. **QA before sending**: render stills at beat boundaries (`node render.js --still 1.0,5,9 --out stills`), make a contact sheet with PIL, LOOK at it: nothing clipped, captions (y>=1650) not covered, no leftovers, one hero per beat, scene matches what is being said.
8. Deliver with SendUserFile; say plainly what is approximate/missing (e.g. caption word timing proportional until `words.json` exists). Commit scripts (never frames/clips/wavs/mp4) and push.

## Engine (engine/)
- `align.py <vo.wav>`: silence detection + DP match to phrase boundaries (approximate) -> `build/align.json`.
- `make_audio.py <vo.wav> [speed=1.04]`: shrinks silences (0.11s in-sentence, 0.27s at sentence end), atempo (raise to hit 60s), generates music (104 BPM lo-fi house, numpy) ducked under the voice, mixes -> `build/timeline.json`, `mix.wav`.
- `render.js`: Playwright+Chromium screenshots `index.html` per frame via `window.setT(t)`, 1080x1920@30fps (~1.5 min for 65s; run long renders in the background or split with resume: existing frames are skipped).
- `build.sh`: whole pipeline to MP4 (imageio-ffmpeg binary; system ffmpeg may be missing). Verified to reproduce the approved timeline byte-for-byte (see Verification).
- `timeline.js`: `makeTimeline(parent,W,H,style).draw(state)` canvas Premiere-like timeline: `{cuts,razor,flagS,flagR,sil,rep,caps,markers,sel,play,clean,pulse}`; returns `{endX,...}`.
- `scenes.js` components: real UI panel with zoom/ring/cursor/click ripple (`PN`, `ux/uy`, `ring/setRing`, `cursorEl/moveCursor`, `rippleSet/doRipple`), `pop`, `slideIn`, `beat`, `eo3/eoB`, `bigEmoji/setXf`, `drawAIOrb` (3D neural sphere + glass AI orb), day->night sky + giant clock, cloud transcription, speech-bubble dialects, editor word-fix, typed URL browser mock, confetti, karaoke captions (Word Box: active word yellow #FFD200 box, Cairo Black, <=3 words per chunk, merged English words, auto-fit, proportional timing unless `words.json`).
- Approved scene order (Happy Duck reel): Hook (timeline cut by hand, "2026" calendar with X) -> Problem (REC, one timeline, giant clock, stuck export) -> Solution (AI orb, duck, Pr + duck, wand cleans timeline) -> Feature 1 (real UI walkthrough, word-boundary vs waveform diagram, timeline cleanup, markers vs real cuts) -> Feature 2 (templates -> generate -> cloud -> karaoke phone -> dialect bubbles -> fix a word) -> CTA (browser URL + download, Bio link, "AI edits, you direct").

## Content rules (claims discipline)
Only claims the owner can prove. Never accuracy %, ms speeds, "100%", "all languages". Trial length only if confirmed (say "جرّبها مجاناً"). Privacy claims must match the real data flow (silence removal local; repetition/captions send audio to the server; no video frames). Arabic + English only. Say what the feature does ("بيقص على حدود الكلمات مش على موجة الصوت").

## Environment lessons
- Cloud sandbox: `pip install` works; Chromium at /opt/pw-browsers; playwright global at /opt/node22/lib/node_modules/playwright; `rm -rf dir/*` with relative globs after `cd` is blocked (delete explicit files instead); long commands >120s go to background (wait with an `until` loop on a file).
- Permission classifier denied: self-wake scheduling (send_later/cron), downloading from external hosts. Do not work around; the owner says "كمل" instead.
- The stop hook wants all files committed and pushed: keep `.gitignore` covering frames/clips/out/wavs/pycache.
- Repos are public; pushing text/scripts is fine, the owner accepted that the reel assets and VO may be public.

## Happy Duck specifics
Assets repo (Gemini side): https://github.com/sdfbs/happyduck-assets (branding/, fonts Cairo, ui_01..09 PNG 1040x1500 English UI, media clips, `mock_ui.html`, capture scripts). `scenes.js` expects in `engine/assets/`: `ui_0*.png`, `custom_duck.png`, `Cairo-*.ttf`, and in `engine/clips/`: `cut_demo/`, `caption_demo/`, `caption_crop/` (frames from `media/cut_demo.mp4`, `caption_demo.mp4`; `caption_crop` = caption_demo 13.6s-20.4s cropped `crop=1260:1000:660:0,scale=1000:-2`). Brand: yellow #FFD200, dark #090A0C/#111317, text #9499A1 muted, Cairo (Arabic) / Inter. Product facts confirmed by Gemini from code: tabs Smart Cut (Silence Removal default / Repetition Removal), button "Cut & Clean"; Caption tab (Templates/Manual), button "Generate Caption", 48h free trial, site happyduckai.com, real ripple-delete cuts on word gaps (Whisper word-level), captions as nested sequence karaoke with editor.

## Verification log
- Timeline identical when `align.py`+`make_audio.py` are run from the skill against the approved VO.
- Full `build.sh` run from the skill folder: see end of this file for the last result.
- Last full run (2026-09-30): `engine/build.sh` from the skill folder on the approved VO produced 1957 frames, 19.9MB MP4; 10 of 11 sampled frames byte-identical to the approved reel, the 11th differs by max 26/255 on a few pixels (mean 0.0014), i.e. reproducible.
- Gemini channel: Claude can read `sdfbs/happyduck-assets` (clone/pull works) and Gemini reads `abwshnaf7-arch/2334` anonymously (his `git ls-remote` worked). His replies so far: only `001-reply.md`; 002/003 (autonomous polling, VO word timestamps) not yet answered.
