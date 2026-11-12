#!/bin/sh
# Render a video project: master (1080p, CRF 18) -> web delivery (CRF 26, faststart) -> poster.
# Usage (from video/): sh tools/render.sh projects/<video-id>
set -e
cd "$(dirname "$0")/.."
P="$1"
ID=$(node -e "console.log(require('./$P/project.json').videoId)")
COMP=$(node -e "console.log(require('./$P/project.json').composition)")
AT=$(node -e "console.log(require('./$P/project.json').posterAt)")
node tools/timeline.mjs "$P"
mkdir -p out
nice -n 19 ./node_modules/.bin/remotion render src/index.ts "$COMP" "out/$ID-master.mp4" \
  --codec=h264 --crf=18 --concurrency=1 --timeout=60000 --log=error
nice -n 19 ffmpeg -y -loglevel error -i "out/$ID-master.mp4" \
  -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 128k "out/$ID.mp4"
nice -n 19 ffmpeg -y -loglevel error -ss "$AT" -i "out/$ID.mp4" -frames:v 1 -vf scale=1280:-2 -q:v 4 "../public/posters/$ID.jpg"
ls -la "out/$ID.mp4" "../public/posters/$ID.jpg"
