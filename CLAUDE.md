# Project context (read this first in every new session)

Owner (non-technical, speaks Egyptian Arabic) makes promo/UGC reels for his product **Happy Duck AI**, an Adobe Premiere Pro extension (Smart Cut = silence/repetition removal, Caption = karaoke captions, site happyduckai.com). Reply to him in short Egyptian Arabic, no jargon. He wants to be out of the loop: no relaying messages, no commands.

## How to work
- Use the skill **`reel-maker`** (`.claude/skills/reel-maker/SKILL.md`). It holds the whole workflow, design rules (show don't tell; ONE hero per beat), the engine (`engine/`), the Claude<->Gemini channel (`CHANNEL.md`), templates and the owner guide. Read `SKILL.md` and `CHANNEL.md` before doing anything.
- This branch is `claude/bold-thompson-v8wyym`. The skill exists ONLY on this branch (the repo default branch is the old dinosaur film). Sessions must start on this branch.
- Do not create a PR unless the owner explicitly asks. Commit + push work to this branch (stop hook requires no untracked files). Never commit frames/clips/wavs/mp4 (see `.gitignore`).
- Permission classifier blocks: self-wake scheduling, downloads from external file hosts. Do not work around; the owner says "كمل".

## The other agent
Gemini (Antigravity) runs on the owner's Windows PC and provides real assets/facts. Talk to it ONLY through GitHub:
- Claude -> Gemini: numbered files `comms/to-gemini/NNN-*.md` in THIS repo/branch (public). Gemini polls every ~5 min (verified, latency 5-10 min).
- Gemini -> Claude: `https://github.com/sdfbs/happyduck-assets` (main): assets in `happyduck-assets/**`, replies `comms/to-claude/NNN-reply.md`, voice in `happyduck-assets/voice/` (words.json = word timings). Clone/pull anonymously to `/home/user/assets-repo`.
- Last message numbers: 001..008 used (next = 009; 007 = ui regression fix request, 008 = feature-facts document + native-vs-extension tests for the next reel ideas). Verify everything Gemini delivers by opening it; his reply texts contain small factual slips.

## Current status (update this section at the end of every session)
- Reel v4 (65 s, 9:16, Egyptian VO, generated music, visual motion graphics, one hero per beat) was delivered to the owner. Files: `reel/` (scenes.js, timeline.js, render.js, build/*) and the same engine in the skill. The voice-over is `comms/assets/vo_original.wav` (75 s, hook #4 script in `comms/SCRIPT.md`).
- Assets from Gemini (English UI screenshots 1040x1500, clips, branding, fonts) are in `sdfbs/happyduck-assets`. `ui_09` is now the real caption editor. The Arabic screenshots (`ar/`) are NOT used (owner wants English only).
- v5 DONE (2026-10-01): karaoke captions + phrase/beat times now use Gemini's `words.json` TIMES aligned to script tokens by `wordsync.py` (fuzzy match; called from `make_audio.py`, which now takes `<wav> [speed]` and writes `words` per phrase into timeline.json; `scenes.js` uses them). Output `reel/out/reel_v5.mp4` (sent to owner). Engine copy in the skill updated.
- WARNING: Gemini's latest `happyduck-assets` commit e00504e broke `ui_01..ui_08` (all became the caption editor). Use the versions from first commit `306b519` (`git show 306b519:happyduck-assets/ui_0N...`) until he fixes them (asked in `comms/to-gemini/007-ui-regression.md`). Next message number = 009.
- Rebuild from scratch: assets from the assets repo (+clips extracted per SKILL.md), `python3 align.py` (uses build/align.json; hardcoded path in reel/align.py), `python3 make_audio.py ../comms/assets/vo_original.wav`, copy build/* to assets/, `node render.js --all --workers 4 --out frames`, ffmpeg encode.
- Waiting on the owner: feedback on v4 (he sends a screenshot of any scene he dislikes), and "كمل" whenever Gemini finished something.

## First message the owner can send in a new session
"اقرا CLAUDE.md وSKILL.md بتاع reel-maker وكمل من حيث وقفنا: <الطلب>" (e.g. "اعمل النسخة 5 بتوقيت الكلمات" or "عايز ريل جديد عن <ميزة>").
