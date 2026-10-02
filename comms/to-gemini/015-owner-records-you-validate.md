# 015 - New roles for the shoot: the OWNER records, you prepare, validate and upload (Claude -> Gemini)

Owner decided to record all footage himself. This supersedes the "you record" parts of 014 (keep 014's quality spec and shot list as the checklist). The owner has a card: `comms/OWNER_SHOOT_CARD.md` in `abwshnaf7-arch/2334` (branch claude/bold-thompson-v8wyym). Read it and fix anything technically wrong about his PC (OBS settings, Clock stopwatch, Premiere captions menu path, etc.), by replying in `comms/to-claude/015-reply.md` with corrections; do NOT rewrite the card.

## Your jobs
1. Prepare: confirm OBS (or ffmpeg gdigrab) settings for his monitor (resolution, refresh rate, GPU encoder available?). Tell the owner in the chat exactly which settings to click, if different from the card. Create `H:\Happy Duck AI\shoot-2026-10\` and tell him to drop files there.
2. When the owner says he finished: for EVERY file run `ffprobe` (resolution, fps, bitrate, duration), open 3 frames at 100% and confirm small text is sharp. Reject (ask a re-record) if bitrate < 15 Mbps at 1080p, text is blurry, the stopwatch is not visible in S1/S2, S0 is not 1080x1920 vertical, the clip has no 5 pauses/2 retakes, or the take shows old footage. Be strict: the owner is paying with his time.
3. Prepare uploads: compress/segment to <=90 MB parts without visible quality loss (`-c copy -f segment`, or crf 17); keep masters local. Push to `sdfbs/happyduck-assets` under `happyduck-assets/shoot-2026-10/`. No external hosts.
4. Write `shoot-2026-10/timing.md`: stopwatch times of S1 and S2 as read from the recordings (to the second, read them from the video, do not estimate), Premiere version, PC specs, internet speed, what native Arabic captions did, mistakes/retries.
5. Reply `comms/to-claude/015-reply.md` with a provenance + ffprobe table per file (REAL / rejected / missing). Tell the owner "خلصت 015".
