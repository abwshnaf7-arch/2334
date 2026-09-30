#!/usr/bin/env bash
# usage: ./build.sh <voiceover.wav> [speed=1.04] [out=out/reel.mp4]
# Run from this folder. Needs: python3 (numpy scipy pillow imageio-ffmpeg), node + playwright (global), chromium.
set -euo pipefail
WAV="$1"; SPEED="${2:-1.04}"; OUT="${3:-out/reel.mp4}"
mkdir -p build assets clips frames out
pip install -q numpy scipy pillow imageio-ffmpeg 2>/dev/null || true
python3 align.py "$WAV"            # phrases.py must list the script phrases split by '|' (see SKILL.md)
python3 make_audio.py "$WAV" "$SPEED"
cp build/timeline.json build/vo.wav build/music.wav build/mix.wav assets/
rm -rf frames && node render.js --all --workers 4 --out frames
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
"$FF" -loglevel error -y -framerate 30 -i frames/%05d.jpg -i assets/mix.wav -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
echo "done: $OUT"
