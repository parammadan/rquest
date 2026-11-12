# RQuest — Research Programmer Academy

A game-based learning platform for R programmers, research engineers, and statisticians.
Five worlds take a learner from R fundamentals to reproducible statistical programming.

Independent portfolio project. Not affiliated with or endorsed by any institution. All data is synthetic.

**Status: Phase 2 complete.** All 15 challenges across the five worlds run real R in the browser (webR)
and are validated automatically. XP comes only from those validations. Lessons (video plus a comprehension
check) are Phase 3. A world unlocks once the
previous world is *cleared*, meaning all its challenges and its boss are validated; lessons add bonus XP
and count toward full mastery.

## Run

```bash
pnpm install
pnpm dev                 # http://localhost:3000 (dev scenarios at /academy/dev)

pnpm verify              # typecheck + lint + unit tests + production build
pnpm build && pnpm test:e2e            # 22 browser checks (system Chrome via playwright-core)
pnpm build && pnpm test:e2e:challenges # real-R challenge flows in Chrome via webR (needs network)
pnpm build && pnpm test:validators      # every reference solution passes; every starter fails
SHOTS=1 pnpm test:e2e                  # also writes docs/screenshots/
NEXT_PUBLIC_RQUEST_DEV_TOOLS=1 pnpm build && node scripts/scenario-shots.mjs   # seeded-state screenshots
```

## Architecture

```
src/
  domain/        framework-free model + rules
    types.ts         Mission, Lesson, Challenge, ChallengeType, Achievement, VideoMetadata,
                     ProgressEvent, ValidationReceipt, XpEvent, MissionStatus …
    progression.ts   deriveProgress(snapshot, catalog) — XP, levels, mission states, achievements
    completion.ts    submitCompletion() — the only write gate; ValidatorRegistry
    levels.ts        XP curve
  content/       mission + achievement catalog (data only) and an indexed Catalog
  persistence/   ProgressRepository interface + browser-storage implementation
  features/
    progress/      store (useSyncExternalStore), provider, dev scenarios
    map/           MissionMap, MissionNode, MissionBriefing, layouts
    missions/      MissionDetail + route gate, LessonTimeline, placeholders, locked dialog
    dashboard/     dashboard and progress screens
    achievements/  badge + collection
    shell/ brand/ worlds/ landing/
  components/    UI primitives (Button, Dialog on native <dialog>, ProgressBar, chips …)
  app/           routes only — thin wrappers around feature screens
```

**Progress is event-sourced.** The only thing stored is an append-only log of `item.completed`
events. Each event carries a `ValidationReceipt`. XP, level, mission status, and achievements are
re-derived on every read, so they cannot drift from the evidence. The derivation rules:

- XP comes from the catalog, never from the stored event.
- The first valid completion of an item wins; duplicates are ignored.
- A receipt must name the validator the item declares.
- Completions inside a locked mission are rejected.

**Write gate.** `submitCompletion` accepts a receipt only when four things hold:

1. The item is `available`, not `planned`.
2. The validator is registered.
3. The item is not already complete.
4. Its mission is unlocked.

Phase 1 registers no validators, so nothing can be submitted. The UI doesn't expose `submit` at all.

**Hydration.** The server and the first client render use an empty `ready: false` snapshot. Stored
progress loads straight after hydration, so the markup always matches. Mission pages show a
skeleton until the lock check can run.

**Dev scenarios.** These are seeded snapshots stored under a separate key with `origin: "dev-scenario"`.
A banner shows on every page while one is active. They are available in `next dev` only, or with
`NEXT_PUBLIC_RQUEST_DEV_TOOLS=1`, and they never touch the learner's log.

## Phase 2: in-browser R and validation

- **Runtime** (`features/runtime/r-session.ts`): one webR session per tab, loaded lazily from the
  official CDN and pinned to webR 0.6.0 (R 4.6), so nothing ships in the bundle.
  - Jobs are queued one at a time, and each has a wall-clock limit.
  - A runaway job such as `while (TRUE) {}` is handled by discarding the worker and restarting R.
- **Validators** (`content/validators/`) are data: R setup code (synthetic data and files) plus R check
  expressions. Each challenge checks inputs the learner hasn't seen, so hard-coded answers fail.
- **Harness** (`features/runtime/harness.ts`):
  1. Runs the learner's code in a fresh environment and a fresh working directory.
  2. Evaluates each check in a child environment.
  3. Returns only PASS or FAIL for each check.

  Printed output can't affect the verdict, and the harness environment is locked against redefinition.
- **Trust boundary** (`features/runtime/evaluate-challenge.ts`): a `ValidationReceipt` is issued only
  when every check passes. Its SHA-256 digest binds it to the exact code that passed. The store then
  applies the same write gate as before: available item, registered validator, matching receipt, no duplicates.
- Reference solutions live in `content/validators/reference-solutions.ts`. Only tests import that file,
  and it isn't in the client bundle.
- **Limitation:** validation runs on the client, so a learner who edits browser storage or the JS
  can forge progress. Server-side re-validation needs a backend, which is a later phase.

## Extension points

- To add a validator, define it in `content/validators/` and mark the challenge `implemented: true`.
  A unit test fails if a challenge and its validator don't match up.
- To move to a database, implement `ProgressRepository` against an API.
- `VideoMetadata` (status, src, transcript, outline) is ready for generated lessons in Phase 3.
