---
name: reel-maker
description: Build a vertical (9:16) promo/UGC reel for a SaaS or plugin from a voice-over, real product screenshots and screen recordings, entirely in code (HTML/canvas frames -> ffmpeg MP4). Use when the owner gives a voice-over or script and asks for a reel, UGC explainer, product video, or "اعمل ريل / فيديو شرح / مونتاج". Visual-first motion graphics, Egyptian-Arabic karaoke captions, generated music with ducking.
---

# Reel maker (Happy Duck AI reel, reusable)

Goal: from (voice-over WAV + script + real assets) produce a polished 9:16 MP4 fast, with the same look as the approved reel.
Reply to the owner in Egyptian Arabic, short, no jargon. The owner is not technical and does NOT want to relay messages or run commands.

## The one rule the owner insisted on
**Show, don't tell.** Every idea must be a visual scene (motion graphics of the real timeline/UI, icons, metaphors, before/after), never a card with a sentence. On-screen text = the karaoke caption + tiny labels/numbers only. If a scene reads like a slide, redo it.

## Composition rule (learned the hard way)
**ONE hero per beat.** Each phrase/beat has a single large centered hero; the previous hero fully fades out (`beat(t,a,b)` helper) before the next fades in. Never stack 3+ animated things (clock + headphones + timeline + phone at once looked random and distracting). Keep the same hero across related beats (e.g. one timeline: silences -> repeats -> captions). No decorative wipes/overlays, no leftover emoji/elements from earlier beats (every created element must be hidden outside its beat). Always check stills at beat boundaries for leftovers.

## Pipeline (engine/ in this skill; copy it to a working dir, e.g. reel/)
1. **Brief**: fill `brief-template.md` (ask the owner only what is missing; propose defaults). Get the script in final form.
2. **Assets** must be real files inside the repo/workdir (you cannot read the owner's PC). Needed: logo, brand colors, Cairo font, 6-9 real UI screenshots, short screen recordings, ideally a raw-vs-edited clip. Verify each file by LOOKING at it (Read the PNG / extract frames): names and descriptions can be wrong (e.g. a "Caption Editor" screenshot was a duplicate of another screen).
3. **Voice-over**: owner generates it (TTS prompt: young Cairene male, friendly, confident, medium-fast). Write the script in phrase units in `engine/phrases.py` (`PHRASES`, phrases separated by `|`, lines = sentences; years written as words for TTS).
4. `engine/build.sh <vo.wav> [speed]`:
   - `align.py`: finds silences, DP-matches them to phrase boundaries by character count -> `build/align.json` (approximate; if real word timestamps exist, use them instead).
   - `make_audio.py`: shrinks silences (0.11s inside a sentence, 0.27s at sentence end), `atempo` (default 1.04; raise to hit 60s), generates music (104 BPM lo-fi house, numpy) ducked under the voice, mixes -> `build/timeline.json` (phrase times after tightening), `mix.wav`.
   - `render.js`: Playwright + Chromium screenshots `index.html` frame by frame (`window.setT(t)`), 1080x1920, 30fps, ~1.5 min for 65s.
   - ffmpeg encode (imageio-ffmpeg binary; system ffmpeg may be missing) -> MP4.
5. **Scenes** live in `scenes.js`, anchored to phrase start times via `T(i)` (i = phrase index in phrases.py), so re-timing is automatic. Edit scenes for the new product; reuse the components below.
6. **QA before sending**: render stills (`node render.js --still 1.0,5,9 --out stills`), build a contact sheet with PIL, LOOK at it. Check: nothing clipped at the edges, captions not overlapping visuals (caption zone y>=1650), no text walls, each scene matches what is being said at that moment. Then deliver with SendUserFile and be honest about what is approximate.

## Reusable components (scenes.js / timeline.js)
- `makeTimeline(parent,W,H,style).draw(state)` canvas Premiere-like timeline: state `{cuts, razor, flagS, flagR, sil, rep, caps, markers, sel, play, clean, pulse}` -> razor sweep, flagged silences/repeats, deletion with ripple close, caption blocks, markers-only vs real cuts, sheen. Returns `{endX,...}` (use for before/after bars).
- Real UI panel with zoom/ring/cursor/click-ripple: `PN`, `ux/uy`, `ring/setRing`, `cursorEl/moveCursor`, `rippleSet/doRipple` (coordinates are in the source screenshot's pixels).
- `pop`, `slideIn`, `eo3/eoB` easings, `bigEmoji/setXf`, canvas sky/clock (time drain), neural-net burst, cloud transcription (waveform -> cloud -> words -> caption track), speech-bubble dialects, typed URL in a browser mock, confetti.
- Karaoke captions: Word Box style (active word = yellow box, #FFD200), Cairo Black, chunks of <=3 words per phrase, consecutive English words merged, auto-fit to 1000px. Word timing is proportional within a phrase unless `words.json` is provided.
- Scene order that worked: Hook (problem as visual + "2026" stamp) -> Problem (time drain: clock, day->night, manual cutting, stuck export) -> Solution (AI burst -> logo -> "Pr + duck" -> wand cleans the messy timeline) -> Feature 1 real UI walkthrough + diagram (word-boundary cuts vs waveform cuts) + timeline cleanup + "real cuts not markers" -> Feature 2 (templates -> generate -> cloud -> karaoke phone -> dialect bubbles -> fix a word) -> CTA (browser + URL + download button, bio link, "AI edits, you direct").

## Content rules (claims discipline)
Use only claims the owner can prove. Never say accuracy %, ms speeds, "100%", "all languages". Trial length only if confirmed (say "جرّبها مجاناً"). Privacy claims must match the real data flow. Arabic + English only unless verified. Write what the feature does ("بيقص على حدود الكلمات مش على موجة الصوت").

## Environment lessons
- Cloud sandbox: no access to the owner's PC; HuggingFace blocked (no Whisper) -> ask for word timestamps from the owner's side if precise karaoke is needed. `pip install` works. Chromium at /opt/pw-browsers, playwright global at /opt/node22/lib/node_modules/playwright.
- Automatic self-wake-ups (send_later/cron) and downloading from external file hosts were blocked by the permission classifier; do not work around it. Pushing to the session repo works. The repo may be public: push text/scripts freely, but do not push the owner's files without okay.
- A second agent (Gemini) on the owner's PC prepared assets through a shared repo; the owner only has to say "كمل". Put requests in `comms/to-gemini/NNN-*.md` with exact asset names.
- Commit generated scripts; never commit frames/clips/wavs/mp4 (gitignore).

## Happy Duck assets
Real UI screenshots/recordings/logo/fonts are in https://github.com/sdfbs/happyduck-assets (public). `scenes.js` expects them copied into `engine/assets/` (ui_0*.png, custom_duck.png, Cairo-*.ttf) and `engine/clips/cut_demo|caption_demo|caption_crop` (frames extracted with ffmpeg at 30fps, scale=960).
