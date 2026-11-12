# RQuest instructional videos

Code-driven video pipeline: **script → AI narration → timeline → Remotion render → captions + app data**.
There is one video per world, shared by that world's three lessons.

Video 1 is **World 1: The Data Lab. Introduction to R for Research Programmers**.
It runs 3:13 (193.5 s) at 1920×1080, 30 fps, with 10 narrated scenes, an intro and an outro.

## Pipeline

| Step | Command | Output |
|---|---|---|
| 1. Script | edit `script.json` | narration segments: `text` (spoken, with pronunciation hints), `caption` (displayed), `chapter`, `lessonId` |
| 2. Narration | `~/brutalist.art/.venv/bin/python ~/walkthrough-kit/tools/tts.py .` | `audio/sNN.mp3` (Kokoro TTS, voice `am_onyx`, local and free); Whisper reads each clip back to catch mispronunciations |
| 3. Timeline | `node tools/timeline.mjs` | `timeline.json` (scene timing), `../public/captions/data-lab-v1.vtt`, `../src/content/videos/data-lab-v1.generated.ts` (chapters + transcript for the app) |
| 4. Render | `sh tools/render.sh` | `out/data-lab-v1-master.mp4` (H.264 CRF 18), `out/data-lab-v1.mp4` (web delivery, CRF 26, faststart), `../public/posters/data-lab-v1.jpg` |
| 5. Publish | `gh release upload media-v1 out/data-lab-v1.mp4` | The Pages workflow copies `media-*` release assets into `/media/`. MP4s never enter git history. |

Preview interactively with `npx remotion studio src/index.ts`.

Remotion 4.0.486 / React 18. Locally `node_modules` is a symlink to an existing Remotion install. On a fresh
machine, run `pnpm install` in this folder instead.

Captions are timed per sentence, in proportion to sentence length within each narrated segment. Segment
boundaries come from the measured audio, so captions never drift by more than one sentence.

## Scene-by-scene storyboard (Video 1)

| # | Chapter → lesson | Visual | Teaching point |
|---|---|---|---|
| Intro | — | RQuest mark, "World 1 · The Data Lab", title | — |
| s01 | Why R for research → L1 | Provenance chain: file → code → run; "re-run it" banner; Free / Scriptable / Re-runnable chips; lesson roadmap | Scripts make every number reproducible |
| s02 | Vectors → L1 | Console types `sites <- c(...)`, `typeof`, `length`, `toupper`; six indexed vector cells flip to upper case at once | One type per vector; vectorized functions |
| s03 | Vectors → L1 | `c(1, "2")` → `"1" "2"`; cells recolour to text; a numeric column turned to text by `"9.8 kg"` | Silent coercion; check types on arrival |
| s04 | Writing a function → L1 | `clean_site()` typed with line highlights; `" bos01"` → `trimws()` → `toupper()` → `sub()` → `"BOS-01"`; result vector | Functions, vectorized cleaning, last value returned |
| s05 | Missing observations → L1 | `mean()` → `NA`; `is.na()` mask under cells; `sum(is.na())` → 1; `na.rm = TRUE` → 10.53333 | NA is contagious; drop only on purpose |
| s06 | Data frames → L2 | Six-row synthetic trial table; `trial$outcome`; Baseline rows fade for the Week 12 filter | Data frame = equal-length vectors; `$` and logical rows |
| s07 | Grouped summaries → L2 | dplyr pipeline with highlighted verbs; rows grouped by arm → summary (Placebo rows 2, n 1) | `n()` counts rows, not observations |
| s08 | A realistic example → L3 | Messy CSV with issues highlighted in turn (sites, ages, duplicate, dates); `colClasses = "character"` | Read as text; fix with small named steps |
| s09 | A realistic example → L3 | Three date strings resolved over three `as.Date()` passes; factor, `unique()`, `order()`; check chips | Pass-by-pass parsing, explicit levels, verification |
| s10 | Your first mission → L3 | Recap chips; the "Clean the site codes" challenge card with its 5 real validator checks | Transition into the interactive challenge |
| Outro | — | "Next: Clean the site codes" | — |

Every R output on screen was produced by running the code in R 4.6.1 (dplyr output via the same version).
All data is synthetic.

## Reusing the pipeline for Videos 2–5

1. Write `script.json` for the world: 10–12 segments of about 45–60 words, with chapter ids matching that world's lesson `chapterIds`.
2. Run the narration and timeline steps. Change `VIDEO_ID` in `tools/timeline.mjs` (and the composition id in `src/Root.tsx`).
3. Add scenes using the shared kit in `src/kit.tsx`: `Frame`, `Code` (typing, highlighting, output), `Cells`, `Table`, `Chip`, `Panel`, and `beats()` for sentence-synced timing.
4. Render, upload the MP4 to a `media-*` release, then mark the world's entry in `src/content/videos.ts` as `ready`, with its sources and generated chapters and transcript.
