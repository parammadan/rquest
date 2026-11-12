# Video 2 narration QA

Voice: Kokoro `am_onyx` (local). Every clip was read back with faster-whisper `small.en`.

| Issue heard | Fix |
|---|---|
| "n a underscore r m" → "Anna underscore RM" (twice, with two spellings) | Sentence rephrased to "an argument for dropping missing values"; the caption keeps `(na_rm)` |
| "rocks oxygen two" → "ROC's Oxygen 2" | Spoken as "roxygen two" → read back as "Roxygen 2" |

Read-backs that are Whisper's spelling, not a mispronunciation:
- The letter R is voiced "ar" and transcribed as "our" ("our CMD check").
- "dee plier" → "dplyr" (correct).
- "summarise" → "summarize" (same sound).
- "Bare" → "Bear" (homophone).

Every on-screen file and output comes from a real package built locally:
- R 4.6.1, roxygen2 8.1.1, testthat 3.3.2.
- `R CMD check --no-manual` → `Status: OK`.
- The broken variant shown in the video gives `Status: 1 WARNING, 2 NOTEs`.
