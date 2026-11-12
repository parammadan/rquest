# RQuest instructional videos

Code-driven video pipeline: **script → AI narration → word alignment → timeline → Remotion render → captions + app data**.
There is one video per world, shared by that world's three lessons, plus one short boss debrief per world that
unlocks in the app only after that boss is validated. Each video is a project in `projects/<video-id>/`
(`project.json`, `script.json`, generated `audio/`, `words.json`, `timeline.json`); its scenes are in `src/videos/<world>/`.

| Video | Project | Duration | Narration QA |
|---|---|---|---|
| 1 · Introduction to R for Research Programmers | `projects/data-lab-v1` | 3:16 | see Phase 3A notes below; s04 and s10 re-voiced |
| 2 · From R Scripts to Research-Ready Packages | `projects/package-factory-v1` | 4:34 | `projects/package-factory-v1/narration-qa.md` |
| 3 · When R Works on One Machine Only | `projects/debugging-crisis-v1` | 3:23 | Whisper read-back; "sprintf" voiced as "sprint F" |
| 4 · Testing and Independent QC | `projects/quality-control-v1` | 3:10 | Whisper read-back; q04 and q09 re-voiced |
| 5 · Reproducible Statistical Programming | `projects/research-mission-v1` | 3:03 | Whisper read-back; r04 re-voiced ("with seed, from the with R package") |
| 6–10 · Boss debriefs | `projects/<world>-debrief-v1` | ~1:45 each | see "Boss debriefs" below |

Video 1 is **World 1: The Data Lab. Introduction to R for Research Programmers**.
It runs 3:16 (195.9 s) at 1920×1080, 30 fps, with 10 narrated scenes, an intro and an outro.

## Pipeline

| Step | Command | Output |
|---|---|---|
| 1. Script | edit `projects/<id>/script.json` | narration segments: `text` (spoken, with pronunciation hints), `caption` (displayed), `chapter`, `lessonId` |
| 2. Narration | `~/brutalist.art/.venv/bin/python ~/walkthrough-kit/tools/tts.py projects/<id>` | `projects/<id>/audio/*.mp3` (Kokoro TTS, voice `am_onyx`, local and free); Whisper reads each clip back to catch mispronunciations |
| 3. Alignment | `~/brutalist.art/.venv/bin/python tools/align.py projects/<id>` | `words.json`: Whisper word timestamps for every clip |
| 4. Timeline | `node tools/timeline.mjs projects/<id>` | `timeline.json` (scene timing, sentence starts), `../public/captions/<id>.vtt`, `../src/content/videos/<id>.generated.ts` (chapters + transcript) |
| 5. Render | `sh tools/render.sh projects/<id>` | `out/data-lab-v1-master.mp4` (H.264 CRF 18), `out/data-lab-v1.mp4` (web delivery, CRF 26, faststart), `../public/posters/data-lab-v1.jpg` |
| 6. Publish | `gh release create media-<id> out/<id>.mp4` | The Pages workflow copies `media-*` release assets into `/media/`. MP4s never enter git history. |

Preview interactively with `npx remotion studio src/index.ts`.

Remotion 4.0.486 / React 18. Locally `node_modules` is a symlink to an existing Remotion install. On a fresh
machine, run `pnpm install` in this folder instead.

**Captions (improved in Phase 3B):** each caption sentence is timed from Whisper word timestamps of the real audio
(`tools/align.py`), not estimated from sentence length. Scene animations use the same sentence start times, so
visuals stay in step with the voice. Video 1's captions were regenerated this way; its MP4 is unchanged.

## Scene-by-scene storyboard (Video 1)

| # | Chapter → lesson | Visual | Teaching point |
|---|---|---|---|
| Intro | — | RQuest mark, "World 1 · The Data Lab", title | — |
| s01 | Why R for research → L1 | Provenance chain: file → code → run; "re-run it" banner; Free / Scriptable / Re-runnable chips; lesson roadmap | Scripts make every number reproducible |
| s02 | Vectors → L1 | Console types `sites <- c(...)`, `typeof`, `length`, `toupper`; six indexed vector cells flip to upper case at once | One type per vector; vectorized functions |
| s03 | Vectors → L1 | `c(1, "2")` → `"1" "2"`; cells recolour to text; a numeric column turned to text by `"9.8 kg"` | Silent coercion; check types on arrival |
| s04 | Writing a function → L1 | `clean_visit()` (the lesson's example, not the challenge's `clean_site()`) typed with line highlights; `" WEEK-12"` → `trimws()` → `tolower()` → `sub()` → `"Week 12"`; result vector | Functions, vectorized cleaning, last value returned |
| s05 | Missing observations → L1 | `mean()` → `NA`; `is.na()` mask under cells; `sum(is.na())` → 1; `na.rm = TRUE` → 10.53333 | NA is contagious; drop only on purpose |
| s06 | Data frames → L2 | Six-row synthetic trial table; `trial$outcome`; Baseline rows fade for the Week 12 filter | Data frame = equal-length vectors; `$` and logical rows |
| s07 | Grouped summaries → L2 | dplyr pipeline with highlighted verbs; rows grouped by arm → summary (Placebo rows 2, n 1) | `n()` counts rows, not observations |
| s08 | A realistic example → L3 | Messy CSV with issues highlighted in turn (sites, ages, duplicate, dates); `colClasses = "character"` | Read as text; fix with small named steps |
| s09 | A realistic example → L3 | Three date strings resolved over three `as.Date()` passes; factor, `unique()`, `order()`; check chips | Pass-by-pass parsing, explicit levels, verification |
| s10 | Your first mission → L3 | Recap chips; the "Clean the site codes" challenge card with its 5 real validator checks | Transition into the interactive challenge |
| Outro | — | "Next: Clean the site codes" | — |

Every R output on screen was produced by running the code in R 4.6.1 (dplyr output via the same version).
All data is synthetic.

## Video 2 storyboard (From R Scripts to Research-Ready Packages)

Every file and output on screen comes from a real `labtools` package built locally: R 4.6.1, roxygen2 8.1.1, and
testthat 3.3.2. `R CMD check` gave `Status: OK`; the deliberately broken variant gave `1 WARNING, 2 NOTEs`.

| # | Chapter → lesson | Visual |
|---|---|---|
| p01 | Why packages → L1 | 15 divergent script copies collapse into one `labtools 0.1.0` package; `packageVersion("labtools")` |
| p02 | Package anatomy → L1 | file tree assembles; the real DESCRIPTION with each field highlighted |
| p03 | Package anatomy → L1 | R/ organised by topic; `utils.R` ✓ versus top-level `library()` ✗ |
| p04 | Exports and the NAMESPACE → L1 | namespace boundary diagram: exported versus internal, with the call path to `.normalise()` |
| p05 | Exports and the NAMESPACE → L1 | `@export` tag → generated NAMESPACE (real) |
| p06 | Documenting with roxygen2 → L2 | roxygen block tags highlighted → `devtools::document()` → generated Rd (real) |
| p07 | Documenting with roxygen2 → L2 | missing `@param na_rm` → real check WARNING → the fix |
| p08 | Managing dependencies → L2 | DESCRIPTION Imports → NAMESPACE importFrom → function calls (animated links) |
| p09 | Managing dependencies → L2 | real check NOTE lines → fixed function with `.data` and imports |
| p10 | Testing with testthat → L3 | tests/ tree, the real test file, real `devtools::test()` output |
| p11 | Building and checking → L3 | source → R CMD build → tarball → R CMD check → real `Status: OK` |
| p12 | Building and checking → L3 | **honest caveat**: what RQuest checks in the browser versus the real R CMD check on your machine |
| p13 | Versions and collaboration → L3 | semver timeline, NEWS.md, git tag, `packageVersion()` |
| p14 | Your Package Factory missions → L3 | the three World 2 challenge cards with XP |

## Adding a world video

1. Create `projects/<world>-v1/` with `project.json` and `script.json`: 10–14 segments of 45–60 words, with chapter ids
   matching the world's lesson `chapterIds`, and spoken and caption text split into the same sentences.
2. Run the narration, alignment, and timeline steps. Read every Whisper read-back and fix spellings in `text`.
3. Add `src/videos/<world>/` (copy `package-factory/Lesson.tsx`) and register the composition in `src/Root.tsx`.
4. Add scenes using the shared kit in `src/kit.tsx`: `Frame`, `Code` (typing, highlighting, output), `Cells`, `Table`, `Chip`, `Panel`, and `useBeats()` for word-aligned timing.
5. Render, upload the MP4 to a `media-*` release, then mark the world's entry in `src/content/videos.ts` as `ready`, with its sources and generated chapters and transcript.

## No answers on screen

A world video teaches the ideas a challenge needs, never the challenge's answer. The unit test
"no world video shows a challenge's reference solution on screen" reads every string in each
`src/videos/<world>/scenes.tsx` and fails if it reproduces half (or three or more lines) of the reference
solution to a challenge in that world or a later one. Starter code and earlier worlds' solutions don't count:
the learner has already seen or written them. Boss debriefs are exempt because they unlock only after the boss
is solved.

The test caught four leaks, now fixed with different worked examples:

| Video | Scene | Was | Now |
|---|---|---|---|
| 1 | s04 | the full `clean_site()` (World 1 challenge 1) | `clean_visit()` on visit labels, as in the lesson; s04 and s10 re-voiced |
| 3 | d04 | the fixed `outcome_table()` (World 3 challenge 1) | `baseline_table()` with the same qualified `dplyr::` calls |
| 4 | q02 | a `summarise_arm()` test matching one the challenge asks for | tests for World 1's `clean_site()`, run with testthat 3.3.2 |
| 5 | r06 | `week12_sentence()`, nearly line for line (World 5 challenge 2) | `change_summary()`: median and IQR by arm via `split()`, real R 4.6.1 output; r06 re-voiced |

## Boss debriefs

Each debrief is data only: `projects/<world>-debrief-v1/script.json` segments carry a `visual`
(`brief`, `code` with per-sentence highlight groups, `mistakes`, `checks`), rendered by the generic
`src/videos/debrief/Debrief.tsx` and registered from `src/videos/debrief/index.tsx`.

The code shown is never retyped. `tools/solution.mts` copies the reference solution the validator self-test
proves passes every check into `solution.json`:

    node --experimental-strip-types tools/solution.mts projects/<world>-debrief-v1 <world>.boss

The "mistakes" are taken from the boss validator's check hints, each naming the check it fails. In the app the
debrief panel (`BossDebrief` in `challenge-workspace.tsx`) stays locked until the boss has a validated receipt,
so it never spoils the solution.
