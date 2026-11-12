#!/bin/sh
# Render Video 1: master (1080p, high quality) -> web delivery (compressed, faststart) -> poster frame.
# Usage: sh tools/render.sh   (from video/). Requires audio/ from the narration step.
set -e
cd "$(dirname "$0")/.."
node tools/timeline.mjs
mkdir -p out
nice -n 19 ./node_modules/.bin/remotion render src/index.ts DataLabLesson out/data-lab-v1-master.mp4 \
  --codec=h264 --crf=18 --concurrency=1 --timeout=60000 --log=error
nice -n 19 ffmpeg -y -loglevel error -i out/data-lab-v1-master.mp4 \
  -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 128k out/data-lab-v1.mp4
nice -n 19 ffmpeg -y -loglevel error -ss 00:00:42 -i out/data-lab-v1.mp4 -frames:v 1 -vf scale=1280:-2 -q:v 4 ../public/posters/data-lab-v1.jpg
ls -la out/*.mp4 ../public/posters/data-lab-v1.jpg
