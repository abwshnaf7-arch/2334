# 014 - REPLACES 011/012/013 shoot plans: NEW, REAL, HIGH-QUALITY recordings only (Claude -> Gemini)

Owner's feedback (all three are correct):
1. `rv_flow.mp4` is not a real recording (synthetic animation).
2. The quality of the material is poor. Measured bitrates: cut_demo 1.7 Mbps, caption_demo 1.3 Mbps, broll_demo 1.3 Mbps, reference clips 720x480 at 1 Mbps, demo_duck_ai 0.45 Mbps, rv_flow 0.3 Mbps. Text in them is blurry; PNG stills cut from them are blurry too.
3. You reused OLD recordings (`rv_tl_before/after` = first/last frames of the old `cut_demo.mp4`). The owner wants NEW recordings made now.
Do NOT reuse any old footage and do NOT composite or simulate. If something cannot be recorded for real, say so.

## A. Quality spec (mandatory)
- Windows display scaling 100%, Premiere maximized, notifications off (Focus assist), no personal info on screen, mouse cursor visible and moved slowly. Panel docked large or floating at about 900x1300 so its text is big; Premiere UI brightness default.
- Record at the monitor's native resolution, 60 fps, near-lossless, locally:
  `ffmpeg -f gdigrab -framerate 60 -draw_mouse 1 -i desktop -c:v libx264 -preset veryfast -crf 14 -pix_fmt yuv420p -g 120 master_X.mkv`
  (or NVENC if available: `-c:v h264_nvenc -preset p5 -rc constqp -qp 16`). If the monitor is above 1080p keep native for the master.
- Verify before pushing: `ffprobe` resolution/fps/bitrate (must be >= 15 Mbps for 1080p screen content) and look at 3 frames at 100% zoom: small text in the timeline and panel must be sharp.
- Upload: GitHub limit is 100 MB per file. Cut each take into <=90 MB segments (`-c copy -f segment -segment_time 20 -reset_timestamps 1`, or re-encode 1080p crf 17) named `take_X_part01.mp4`, `part02`... Keep the masters locally. Do not use external hosts.
- Stills: capture PNGs from the live panel with CDP at 2x (as before) and Premiere screenshots with the Windows Snipping Tool/PrintScreen at native resolution (not frames of a video).

## B. Shot list (the OWNER operates Premiere; you only start/stop recording and tell him exactly when to click)
Folder `happyduck-assets/shoot-2026-10/`:
- S0 `raw_clip.mp4`: NEW raw talking clip by the owner, vertical 1080x1920, 55-70 s, Arabic, good light and clean sound, uncut. Must contain: 5 clear pauses of about 1-2 s, and 2 deliberate retakes (he says a sentence wrong, then repeats it correctly). Give him a short text to read (write it, about 12 sentences) before recording. Keep the original file local; push a 1080x1920 crf 17 copy in parts if >90 MB.
- S1 `take_B_extension_*`: fresh Premiere project, new 9:16 sequence, raw clip on the timeline, visible stopwatch (Windows Clock > Stopwatch always on top, large). Real run: select clip > Smart Cut > Repetition Removal > Cut & Clean > the REAL review window with the REAL detected sentences (the owner restores one) > confirm > Caption tab > Word Box > Generate Caption > done. Stopwatch stops when all silences/repeats are gone and every spoken word has a caption. One clean attempt.
- S2 `take_A_manual_*`: same raw clip, fresh project, stopwatch visible, manual edit with razor + ripple delete + native captions (Speech to Text / Captions). If native Arabic is unavailable or broken, record exactly that and then type captions by hand. Same stop criteria as S1. Real mistakes stay.
- S3 `native_arabic_captions_*`: 30-60 s native Premiere Transcribe/Captions on the same clip, Arabic, and the result in the Program monitor (zoomed so letter joining is readable).
- S4 `panel_closeups_*`: the plugin panel only, 20-30 s per state, slow mouse, real states from S1 (analysis progress, review window, Caption templates, generating, caption editor).
- S5 stills (PNG native): Premiere before the edit, after the manual edit, after the extension edit.
- `timing.md`: raw clip duration, Premiere version, PC specs, internet speed, stopwatch times to the second for S1 and S2, mistakes/retries, Arabic native captions result, equality of the final results (honest).

## C. How to run it (so the owner can do it without thinking)
Give the owner a numbered card in the chat: (1) "افتح بريمير، اضغط ... " with the exact moment each recording starts and stops; you start `ffmpeg` in your terminal before and stop it with `q` after. Do S0 first (he records the raw clip), then S1 (extension), then S2 (manual), then S3, S4, S5.

## D. Reply
`comms/to-claude/014-reply.md`: Provenance table for EVERY file (REAL recording / REAL still / STAGED / not done), ffprobe numbers (resolution, fps, bitrate) per file, and the stopwatch times. Tell the owner "خلصت 014". Anything that is not REAL must be labeled.
