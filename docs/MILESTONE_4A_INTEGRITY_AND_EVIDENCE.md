# Milestone 4A: Grading Integrity & Learning Evidence

**Date:** 2026-11-12 · **Implementation commit:** `1b3d4de` (6 commits on top of `5caae63`) · **Production:** https://parammadan.github.io/rquest/ (deployed by CI run 43308721135, verified below)

**Scope note.** This milestone hardens grading *inside the browser*. Learner code, the grader, and the progress log all
live in the learner's own browser, so these grades are learning evidence, not tamper-proof or certifiable results.
Making grades trustworthy needs a server that re-runs submissions. That is out of scope, and no such server exists.

---

## 1. Defects fixed

| # | Defect (from the product audit) | Fix | Proof |
|---|---|---|---|
| 1 | One line of learner R (`assign("isTRUE", function(x) TRUE, envir = globalenv())`) made every check pass; shadowing `identical`, or rebinding validator helpers, also worked | New isolated grader (§2) | 14 generic adversarial cases and a 15-validator bypass kit, all in real webR, run in CI (§3) |
| 2 | Level 7 needed 2,500 XP; only 2,100 exist | Level 7 is now at 2,000 XP | Unit test: every level reachable; a completed learner is Level 7 with no "XP to next level" |
| 3 | World 1 lesson 1 contained challenge 1's reference solution | New walkthrough built around a different task (§5) | Unit test that fails on the old lesson ("repeats 3/3 lines of data-lab.challenge-1") |
| 4 | Failed submissions left no trace | New `challenge.attempted` event (§6) | Unit and real-webR end-to-end tests |
| 5 | CI did not run the validator self-test | CI now runs it, plus the attempts suite, in real webR before deploy (§9) | CI run 43308721135 |

Found and fixed along the way:

- **The old global grader could be deleted and replaced.**
  - `rm(".rquest")` worked despite `lockBinding`, and a fake `.rquest$validate` then graded every later submission.
  - No global grader exists any more.
- **Two validators read learner code from a global** (`get(".rq_code", envir = globalenv())`) that learner code could overwrite.
  - They now read a protected copy.
- **The package checks cache their build result in a setup environment (`.pkg_state`).** Learner code could have pre-filled it with a fake "build OK".
  - Checks now use a copy taken before the learner's code runs.

## 2. Validator isolation: what changed

**Before:** `.rquest` was a global list whose functions were enclosed by the global environment. Learner code and checks ran in environments whose lookup reached the global environment first. Checks were passed to R together with the learner's code.

**After** (`src/features/runtime/harness.ts`, `grade.ts`, `r-session.ts`):

1. **A private grader.**
   - Evaluating `R_GRADER` returns a list of four functions (`prepare`, `learn`, `check`, `tampered`). JavaScript keeps that list as a webR handle.
   - Nothing is bound in R's global environment, so there is no name for learner code to replace.
   - The functions are enclosed by a locked environment `G`, whose only parent is `B`: a copy of base R taken at install time, before any learner code ran. `B`'s parent is `emptyenv()`.
   - So the grader's own calls (`isTRUE`, `tryCatch`, `::`, `eval` …) can't be redirected by learner globals.
2. **A trusted overlay for checks.**
   - Learner code and setup still share one environment, because validators rely on `.learner_env`, `.setup_names`, and so on.
   - Each check is evaluated in a child of a locked "trusted" environment that sits in front of it. That environment holds:
     - pristine base R functions and constants;
     - copies of every setup binding taken *before* the learner's code ran;
     - the learner's code text (`.rq_code`).
   - Setup helper functions are re-enclosed in the trusted environment, and plain setup environments (caches) are copied.
   - Result:
     - shadowing `identical`, `isTRUE`, `all.equal`, `%in%`, `length` … has no effect on checks;
     - rebinding a validator helper (`.mutants`, `.same_table`, `.caught` …) has no effect;
     - pre-filling a cache has no effect;
     - learner-defined functions (`clean_site`, `run_report` …) still resolve, so the checks can test them.
3. **Two phases.** JavaScript calls `learn(code, setup)` first, then `check(state, expr)` once per check, each time in a fresh evaluation environment built only from JavaScript-side handles. Top-level learner code never sees the check expressions.
4. **Tamper detection.**
   - After the learner's code, and after every check, every base R function binding (in `baseenv()` and the base namespace) is compared with the install-time snapshot. Active bindings, `.Last.value` and `.Traceback` are skipped.
   - Any change refuses grading with a new `integrity` result, and the app discards the R worker so the next run starts clean. Changes include `unlockBinding` + `assign`, and `trace()`.
   - The same check runs after the Run button.
5. **Kept as before:**
   - the fresh temporary working directory per evaluation;
   - per-challenge setup;
   - output that cannot influence verdicts;
   - per-evaluation timeouts that restart R;
   - real webR 0.6.0.

**Not covered (documented, not fixed):**

- Learner code runs in the same R process, so deliberate call-stack walking (`sys.frames()`, `parent.frame()`) combined with `unlockBinding` on the grader's own environments can still interfere.
- A learner-crafted S3 class could also make generic comparisons (`==`, `all.equal`) inside a check return `TRUE`. Checks that use `identical()` are immune to this.
- And a learner can always edit their own `localStorage`.

## 3. Adversarial test results

All three suites run in **real webR (Chrome)** through the app's own grading function, `gradeSubmission`. The self-test calls it via `toString()`, so test and app share one code path. They run in CI before every deploy (`pnpm test:validators`, 60/60 checks).

**Generic cases**, from `scripts/lib/adversarial-cases.mjs`. The "Old harness" column comes from running the same cases against the previous harness, taken from git, in local R 4.6.1.

| Case | Required | New grader | Old harness |
|---|---|---|---|
| Honest wrong answer | FAIL FAIL | FAIL FAIL | FAIL FAIL |
| Global `isTRUE` override | FAIL FAIL | FAIL FAIL | **PASS PASS** |
| Shadow `identical` | FAIL | FAIL | **PASS** |
| Redefine `length`, `all.equal`, `%in%`, `is.na` | FAIL ×3 | FAIL ×3 | **PASS ×3** |
| Rebind a validator helper | FAIL | FAIL | **PASS** |
| Pre-fill a setup cache | FAIL | FAIL | **PASS** |
| Replace the global grader name | FAIL | FAIL | **PASS** (old grader deleted and replaced) |
| Printed "PASS" output | FAIL | FAIL | n/a (grader already destroyed by the previous case) |
| `unlockBinding` + assign on base `isTRUE` | refused | TAMPER | n/a |
| Learner function tampers during a check | refused | TAMPER | n/a |
| Correct code despite global shadowing | PASS PASS | PASS PASS | n/a |
| Learner function uses setup data | PASS | PASS | n/a |
| Syntax error | classified | SYNTAX | n/a |
| Runtime error | classified | ERROR | n/a |

**All 15 validators:**

- Every reference solution passes every check, and every starter fails.
- A bypass kit is prepended to each starter. It contains:
  - global `isTRUE`/`identical` overrides;
  - local `identical`, `all.equal`, `isTRUE` and `setequal`;
  - fake `.caught`, `.all_pass`, `.same_table`, `.same_results`, `.near`, `.fails`, `.documented` and `.examples_run`;
  - a pre-filled `.pkg_state`.
- With the kit, every starter still fails, and no check passes that didn't already pass without it. For example: package-factory challenge 2 passes 4 of 6 checks with or without the kit; quality-control challenge 1 passes 0 of 5.

**Through the real UI** (`pnpm test:e2e:attempts`): the `isTRUE`/`identical` bypass fails with "No XP awarded", and the base-R change shows "Grading refused (isTRUE)" and restarts R.

## 4. Level thresholds

| Level | Title | XP before | XP now |
|---|---|---|---|
| 1 | Research Intern | 0 | 0 |
| 2 | Data Wrangler | 150 | 150 |
| 3 | Package Artisan | 400 | 400 |
| 4 | Debugging Specialist | 750 | 750 |
| 5 | Quality Steward | 1,200 | 1,200 |
| 6 | Reproducibility Lead | 1,800 | 1,800 |
| 7 | Principal Research Programmer | 2,500 (unreachable) | **2,000** |

- Available XP is unchanged: 1,800 from challenges and 300 from lessons, 2,100 in total.
- Level 7 needs every challenge plus at least 10 of the 15 lessons, so it stays a mastery level.
- A learner who completed every challenge but no lessons is still Level 6, 200 XP from the top.
- At the top level the dashboard says "Highest level reached. Every world mastered." (or that remaining lessons still add XP), instead of an impossible "XP to next level".
- All 8 achievements are unchanged. "Principal Programmer" still unlocks at 1,800 XP.
- Tests cover fresh, intermediate, Phase 2 challenges-only, and fully completed learners.

## 5. World 1 lesson changes

- **Before:** the walkthrough "Building clean_site(), step by step" built the exact reference solution to challenge 1, line for line.
- **After:** "Building clean_visit(), step by step" standardises messy visit labels (`"wk12"`, `" WEEK-12"`, `"Wk 4 "` → `"Week 12"` / `"Week 4"`) with `trimws()`, `tolower()`, and `sub()` with a capture group.
  - It teaches the same objectives: vectorised functions, string normalisation, regex backreferences, and leaving `NA` alone.
  - The learner still has to work out the site-code rule (upper case, letters-hyphen-digits) for themselves.
  - All outputs were produced with R 4.6.1.
  - The vector and `NA` examples and the three quiz questions are unchanged.
- **The other 14 lessons were reviewed** by measuring every lesson's code against all 15 reference solutions.
  - The only overlaps are single-line idioms the briefs prescribe: `library(dplyr)`, `group_by(arm)`, `invisible(df)`, and provenance lines such as `input_md5 = unname(tools::md5sum(path))`.
  - No other lesson contains a solution.
- **Guard:** the unit test "no lesson reproduces a challenge's reference solution" fails if a lesson repeats 4 or more significant lines, or half of any solution, or defines a public function a challenge asks the learner to write.

## 6. New attempt event schema

```ts
interface ChallengeAttemptedEvent {
  id: string;
  type: "challenge.attempted";
  itemId: string;            // challenge id
  missionId: MissionId;
  occurredAt: string;        // ISO timestamp
  attempt: number;           // 1-based sequence per challenge
  outcome: "passed" | "failed" | "syntax-error" | "runtime-error" | "timeout" | "integrity";
  failedCheckIds: string[];  // validator check ids; empty unless outcome === "failed"
  activeMs: number;          // active time since the previous attempt (or since opening), capped at 4 h
}
```

No learner code and no personal data are stored in the event. The end-to-end test asserts the exact key set, and that the code text never appears. Code drafts stay in their own keys.

**Rules** (`src/domain/attempts.ts`):

- **One attempt per call to the grader.** Opening a challenge, clicking around, or pressing Run records nothing; a test asserts this.
- **R failing to start, or a package failing to install, is not an attempt,** because the learner's code never ran. Timeouts and integrity refusals *are* attempts, because the code did run.
- **Errors before the checks run** record `syntax-error` or `runtime-error` with no failed checks.
- **Failed check ids are de-duplicated** and limited to that challenge's real checks.
- **Attempts never award XP.** A repeat pass records an attempt; the completion and its XP stay single.
- **Active time** counts only while the page is visible and focused, and the learner has typed, clicked, or scrolled in the last 60 s. A single long gap (sleep, a throttled tab) counts as at most 5 s. Logic in `src/domain/active-time.ts`.

## 7. Migration behaviour

- **New location:** progress now lives at `rquest:progress:v2` (`schemaVersion: 2`).
- **v1 is never rewritten.** `rquest:progress:v1` is never written again, and is removed only by an explicit reset.
  - This matters because a tab still running the previous release (which treats any non-v1 record as empty) keeps working safely.
- **Merging on every read:** completions in v1 that v2 lacks, matched by event id, are merged in.
  - That migrates a v1-only learner on first load, and picks up anything a stale tab records afterwards.
  - The first new event writes v2 with everything combined.
  - **No historical attempts are invented.**
- **Unreadable data is never overwritten.** If v2 is corrupt JSON or has an unknown schema version:
  - nothing is overwritten and new writes are refused;
  - a banner explains the problem and links to Reset.
- **Forward compatibility:** events written by a newer version are kept, unchanged, on every write.
- **Reset** clears v1 and v2 together, so nothing comes back from v1. Code drafts are kept.
- **Tested** with unit tests and in real browsers, including against production:
  - a fully completed v1 learner: 2,100 XP, Level 7, 8/8 achievements, 15/15 lessons and challenges, with the v1 record left byte for byte;
  - a Phase 2 challenges-only learner: 1,800 XP, every world cleared;
  - stale-tab merging, corrupt data, future versions, preserved unknown events, and reset.

## 8. Learning insights

**Your Learning Insights** sits on the Progress page. Logic is in `src/features/insights/derive-insights.ts`, UI in `learning-insights.tsx`.

**Headline numbers**, all derived only from recorded attempts:

- challenges attempted (out of 15);
- challenges solved;
- solved on the first try ("x of y", with a percentage);
- graded attempts, with active time.

**Breakdowns:**

- a line counting submissions that stopped before the checks ran (syntax errors, runtime errors, timeouts, refused submissions);
- the five most frequently failed checks, using their real descriptions;
- failed checks grouped by skill.

**Areas needing more practice:**

- A skill qualifies if its checks failed in 2 or more attempts, or are failing on a challenge not yet solved.
- Each area links to the lesson that prepares that challenge, and back to the challenge.

**Honest states:**

- An empty state for learners with no attempts.
- A separate note for completions made before attempt tracking existed. They count for XP but have no attempt history.

**Skill taxonomy** (`src/content/skills.ts`):

- 11 skills, each of the 88 checks tagged with exactly one. A unit test enforces complete, valid coverage.
- It labels what a check exercises. It is not a mastery model, and the UI says so.

**Screenshots:** [`docs/screenshots/4a-insights-panel.png`](screenshots/4a-insights-panel.png) (after real attempts) · [`4a-insights-desktop.png`](screenshots/4a-insights-desktop.png) · [`4a-insights-migrated.png`](screenshots/4a-insights-migrated.png) (migrated v1 learner) · [`4a-insights-mobile.png`](screenshots/4a-insights-mobile.png) (390 px; the tab bar appears mid-page because full-page captures repeat fixed elements).

## 9. CI improvements

`.github/workflows/pages.yml`, before deploy:

1. typecheck, lint, unit tests (41);
2. fetch media, then a static build;
3. `test:e2e`: site checks, offline, using the runner's preinstalled Google Chrome;
4. `test:validators`: real webR, 15 validators plus the adversarial suites;
5. `test:e2e:attempts`: real webR, attempt flow, migration and insights through the UI.

- **Network strategy:** webR and R packages come from r-wasm.org, so each webR step retries once after 30 s. A real regression fails both runs, which blocks the deploy.
- **First run (43308721135):** every step passed without needing the retry.
- **`pnpm verify`** now also runs the validator self-test.

**Local-only suites, and why:**

| Suite | Why it isn't in CI |
|---|---|
| `test:e2e:challenges` | Solves all 15 challenges in the UI, with about 10 minutes of package installs |
| `test:e2e:lessons`, `test:e2e:all-lessons`, `test:e2e:world2` | Stream the videos and run lesson R examples; slow and media-heavy |
| `test:browsers` | Needs Playwright's Firefox and WebKit builds, which aren't installed on the runner |

All of them were run locally and against production for this milestone.

## 10. Complete test results (2026-11-12)

| Suite | Local build | Production |
|---|---|---|
| Typecheck, lint | clean | n/a |
| Unit tests | 41/41 | n/a |
| `test:validators` (real webR) | 60/60 | n/a (in CI: passed) |
| `test:e2e:attempts` (new) | 16/16 | **16/16** |
| `test:e2e` | 23/23 | **23/23** |
| `test:e2e:lessons` | 13/13 | **13/13** |
| `test:e2e:world2` | 10/10 | **10/10** |
| `test:e2e:all-lessons` (15 lessons, 300 XP, debrief locks) | 15/15 + 5 | **15/15 + 5** |
| `test:e2e:challenges` (all 15 challenges via the UI) | 16/16 | **16/16** |
| `test:browsers` (Chrome, Firefox, WebKit: webR, validation, all 10 videos, phone layout) | pass | **pass** |

**Verification items A–J:**

| Item | Result |
|---|---|
| A. Correct solutions still pass | Yes, all 15 |
| B. Documented bypasses now fail | Yes |
| C/D. Failed and successful attempts recorded | Yes |
| E. Repeat submissions don't duplicate XP | Yes |
| F. v1 progress migrates | Yes |
| G. Attempts survive a refresh | Yes |
| H. A completed learner reaches Level 7 | Yes |
| I. Insights match the recorded evidence | Yes |
| J. Lessons and videos unaffected | Yes: all 15 lessons, all 45 quiz questions, all 10 videos in three engines |

**Not run:**

- **Real Safari:** needs `sudo safaridriver --enable`. WebKit, Safari's engine, passed.
- **Real phones:** layout was tested only at 390 px in a desktop browser.

## 11. Git and production

- **Commits:** `e5b2872` harden R grader · `46c40a7` reachable level 7 · `0431bbe` world 1 lesson: no answer leak · `0e165bf` attempt events, schema v2 migration · `38f6c77` learning insights, CI webR checks · `1b3d4de` insights screenshots.
- **Hygiene:** no secrets, media or temporary files in the diff (checked before pushing). No dependencies added or upgraded. No videos changed.
- **Production:** https://parammadan.github.io/rquest/ returns 200 and serves "Your Learning Insights" on `/academy/progress/`. Every suite above passed against it.
- **Stored progress:** the v1 → v2 migration check (fully completed learner) passed on production.

## 12. Remaining limitations

1. **The World 1 video still builds the full `clean_site()` solution on screen.**
   - It also calls it "the function from this lesson", which now differs from the lesson walkthrough.
   - Videos were out of scope for this milestone. Fixing this needs a re-voiced and re-rendered "functions" chapter of Video 1.
2. **Browser-level hardening, not verification.**
   - Deliberate call-stack walking with `unlockBinding` on the grader's environments, or crafted S3 classes against non-`identical` checks, can still interfere.
   - Learners can edit `localStorage` directly.
   - Trustworthy grades need server-side re-execution.
3. **The "hidden" checks and the reference solutions are public:** the checks ship in the client bundle, and the solutions are in the public repo.
4. **Insights cover attempts from this release onward, in one browser only.** Earlier completions are shown separately.
5. **Active time is approximate:** interaction-based with a 60-second idle cutoff. It is not a measure of focus.
6. **The skill tags are a fixed, hand-assigned labelling.** They are not a measured skill model.
