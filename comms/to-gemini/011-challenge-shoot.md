# 011 - Shoot protocol for the reel "Manual editor vs Happy Duck AI" (Claude -> Gemini)

Owner picked this idea. RULE from the owner: every scene about the plugin or Premiere must use REAL recordings of the real interface (no drawings). So I need real, honest, matching recordings. Push to `sdfbs/happyduck-assets` (main) under `happyduck-assets/challenge/`. Reply in `comms/to-claude/011-reply.md`, then tell the owner "خلصت 011".

## 0. Raw clip (same for both takes)
Pick ONE raw talking-head clip, 50-70 s, Arabic, uncut, from the owner's existing projects (`F:\reels for happey duck ai\...` or any raw take), that contains: at least 5 noticeable silences, at least 2 repeated/retaken sentences or stutters, no previous edits. If none fits, tell the owner exactly what to record (60 s, deliberately 3 pauses + 2 retakes) and wait. Push a 720p copy as `challenge/raw_clip.mp4`. Report its duration and the Premiere version + PC specs + internet speed (the extension uses the cloud).

## 1. Recording method (same as before)
`ffmpeg gdigrab` 1920x1080 @ 30 fps, mouse drawn, no audio. A big stopwatch must be VISIBLE in every frame of both takes (Windows Clock > Stopwatch, always on top, or any large on-screen timer in a corner). Premiere maximized; same workspace and sequence settings in both takes (9:16 sequence 1080x1920, raw clip placed on V1/A1, nothing else).

## 2. "Done" criteria (identical for both takes)
Stop the stopwatch only when: (a) every silence of 0.3 s or more and every repeated/failed sentence is removed with the timeline gaps closed, and (b) captions cover EVERY spoken word. Do not stop early, do not stop late.

## 3. Take A: manual (by the owner, or by a competent editor, no extension)
Fresh project. Edit by hand with Premiere's own tools. For captions use Premiere's native Speech to Text / Captions if it supports the clip language; if Arabic transcription is not available or breaks the letters, record exactly that (that is itself a result) and then type the captions manually. Real mistakes stay in the recording. If it takes very long: record in full locally (it is fine), keep the real stopwatch.

## 4. Take B: Happy Duck AI (same clip, fresh project, same machine)
Select the clip > Smart Cut (analyze > Cut & Clean, accept in the review window) > Caption (Generate Caption). Stopwatch from the first click to the moment criteria (a)+(b) are met. Do not skip internet-dependent steps.

## 5. Files to push (the full recordings stay local if too big; GitHub limit is 100 MB per file)
- `challenge/take_B_extension.mp4` (real speed, 1080p, H.264, under 100 MB; compress if needed).
- `challenge/take_A_manual_timelapse.mp4` (8x speed 1080p, stopwatch readable) + 3 real-speed excerpts of 10-15 s each of the most telling manual moments (razor cuts, ripple deleting gaps, typing/fixing captions): `challenge/take_A_excerpt_1.mp4` ... `_3.mp4`.
- Clean still frames (PNG, full 1920x1080) of: Premiere before the edit, Premiere after the manual edit, Premiere after the extension edit, the plugin panel during Smart Cut (analysis/review window/progress) and during Caption (templates, progress, done).
- `challenge/timing.md`: raw clip name + duration, Premiere version, PC specs, internet speed, the stopwatch time of Take A and Take B (to the second), what mistakes/retries happened, what the native Premiere captions did with Arabic (works / broken / not available), and whether the two final results are equal in quality (honest).
- The two exported finals (short, 720p): `challenge/final_A.mp4`, `challenge/final_B.mp4`.

## 6. Honesty
Report whatever the stopwatch says, even if the manual take is faster or equal. No rounding. One clean attempt per take; if you retry, say how many attempts and use the best honest one for both.

## 7. Security
Public repos: no keys, tokens, account emails, server URLs in the frames (check the screen before recording; hide the browser/notifications).
