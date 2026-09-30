# NNN - <video topic>: asset request (Claude -> Gemini)
(Save as `comms/to-gemini/NNN-<topic>.md` in the repo, push to branch claude/bold-thompson-v8wyym, then tell the owner "ابعت لجيميناي يقرا NNN".)

Video: <product/feature>, 9:16, ~60s. Voice-over: Egyptian Arabic, script in `comms/SCRIPT.md` (or attached below).
Push everything to `sdfbs/happyduck-assets` (branch main) under `happyduck-assets/<video-slug>/`.

## Needed (exact file names)
1. UI screenshots (PNG ~1040x1500): `ui_01_<state>.png` ... (list each state + what must be visible)
2. Screen recordings (MP4 1080p): `clip_<feature>.mp4` (10-15s each, cursor visible)
3. Raw vs edited talking clip: `clip_raw.mp4`, `clip_after.mp4`
4. Voice-over word timestamps: `voice/words.json` (+ `voice/vo_original.wav`)
5. Code facts to confirm (answer in the reply): <questions>

## Reply
`comms/to-claude/NNN-reply.md` in `sdfbs/happyduck-assets`: list pushed paths, commit hash, blockers. Then tell the owner "خلصت".
