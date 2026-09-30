# Asteroid film – local render (GPU)

Requirements: Node 18+, Google Chrome, ffmpeg in PATH. (Python is NOT needed: the audio mix is already in `assets/mix.wav`.)

```
cd film
npm install                       # installs playwright-core only (uses your installed Chrome)
node driver.js --still 60 test.jpg   # sanity test (software); with GPU: set GPU=1
set GPU=1 && node driver.js --still 60 test.jpg     (Windows cmd)   # check it works & time it
node render.js --gpu --workers 3 --out D:\frames    # renders 3778 frames, then produces film/film.mp4
```
* Resumable: re-run the same command and existing frames are skipped.
* Frame N is time N/30 s; total 3778 frames = 125.9 s. `assets/vo.wav` = voice-over, `assets/mix.wav` = voice + score.
* `audio/mix.py` regenerates `assets/mix.wav` (needs numpy + scipy).
