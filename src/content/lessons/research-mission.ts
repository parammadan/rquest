import type { Lesson } from "../../domain/types.ts";

/*
 * World 5 lessons. Each prepares for one Research Mission challenge and covers chapters of
 * the World 5 video. Outputs were produced with R 4.6.1 and withr. All data is synthetic.
 * Walkthroughs use different functions from the challenges.
 */

const available = { status: "available" } as const;

export const researchMissionLessons: Lesson[] = [
  {
    id: "research-mission.lesson-1",
    kind: "lesson",
    missionId: "research-mission",
    title: "Randomness you can reproduce",
    summary: "Seeds, generator settings, the R 3.6 sample() change, and leaving the caller's random stream untouched.",
    estimatedMinutes: 10,
    xp: 20,
    briefing:
      "A reviewer re-ran your bootstrap and got a different confidence interval. Same seed, same code. Their session uses different generator settings. Make the result independent of the caller, without disturbing the caller.",
    objectives: [
      "Explain what set.seed() fixes, and what it doesn't",
      "Pin kind, normal.kind, and sample.kind",
      "Save and restore the caller's RNG state, or use withr::with_seed()",
      "Make a function's randomness depend only on its seed argument",
    ],
    keyPoints: [
      "set.seed() fixes the generator's state; the same seed gives the same draws only with the same generator settings.",
      'R 3.6 changed sample.kind from "Rounding" to "Rejection": same seed, different sample.',
      "set.seed(seed, kind =, normal.kind =, sample.kind =) pins everything, but also changes the caller's settings.",
      "withr::with_seed() pins the seed and kinds, runs your code, and restores the previous state.",
    ],
    videoId: "research-mission.video",
    chapterIds: ["reviewer", "seeds", "rng-kinds"],
    explanation: [
      {
        kind: "code",
        code: 'set.seed(1); sample(1:10, 3)\nsuppressWarnings(RNGkind(sample.kind = "Rounding"))\nset.seed(1); sample(1:10, 3)\nRNGkind(sample.kind = "Rejection")\nset.seed(1); sample(1:10, 3)',
        output: "[1] 9 4 7\n[1] 3 4 5\n[1] 9 4 7",
        caption: "Same seed, different sampler, different sample. The last line restores R's default.",
        runnable: true,
      },
      {
        kind: "text",
        body: "Passing all three kinds to set.seed() makes the draws independent of whatever the caller configured. But it changes the session's generator settings and random stream as a side effect, so a well-behaved function also restores them.",
      },
      {
        kind: "code",
        code: 'set.seed(42); before <- .Random.seed\ninvisible(withr::with_seed(7, runif(1)))\nidentical(.Random.seed, before)\n\nset.seed(42); before <- .Random.seed\nset.seed(7); invisible(runif(1))\nidentical(.Random.seed, before)',
        output: "[1] TRUE\n[1] FALSE",
        caption: "with_seed() leaves the caller's stream exactly as it was; a bare set.seed() doesn't.",
      },
      {
        kind: "callout",
        tone: "tip",
        title: "Record the seed",
        body: "Make the seed a function argument with a default, and write it into your outputs' provenance. Anyone can then reproduce the run, or deliberately try another seed.",
      },
    ],
    walkthrough: {
      title: "A reproducible random_subset()",
      code: "random_subset <- function(ids, k) {\n  sort(sample(ids, k))\n}",
      steps: [
        { title: "Different every time", note: "Without a seed, each call draws a different subset.", highlight: [2] },
        {
          title: "Add a seed argument",
          note: "Now the seed is explicit and recorded. But the result still depends on the caller's RNGkind(), and set.seed() overwrites their random stream.",
          highlight: [1, 2],
          code: "random_subset <- function(ids, k, seed = 1) {\n  set.seed(seed)\n  sort(sample(ids, k))\n}",
        },
        {
          title: "Pin the generator and restore the caller",
          note: "with_seed() pins the seed and all three kinds, then puts the caller's state back.",
          highlight: [2, 3, 4],
          code: 'random_subset <- function(ids, k, seed = 1) {\n  withr::with_seed(seed, sort(sample(ids, k)),\n    .rng_kind = "Mersenne-Twister", .rng_normal_kind = "Inversion",\n    .rng_sample_kind = "Rejection")\n}',
        },
        {
          title: "Same answer for everyone",
          note: "Any session, any prior RNGkind(): seed 3 always gives these four ids.",
          highlight: [1],
          code: 'random_subset(sprintf("RQ-%03d", 1:20), k = 4, seed = 3)',
          output: '[1] "RQ-004" "RQ-005" "RQ-007" "RQ-012"',
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "seed-not-enough",
        prompt: "Two people run set.seed(1); sample(1:10, 3) and get different results. Most likely reason?",
        options: [
          { id: "a", label: "Their sessions use different RNG settings, e.g. sample.kind = \"Rounding\" vs \"Rejection\"" },
          { id: "b", label: "One of them has a slower computer", feedback: "Speed doesn't affect a deterministic generator. Its settings do." },
          { id: "c", label: "set.seed() only works once per session", feedback: "You can call set.seed() as often as you like. Each call resets the state." },
          { id: "d", label: "sample() ignores the seed", feedback: "sample() uses the seeded generator, but how it turns numbers into indices depends on sample.kind." },
        ],
        correctOptionId: "a",
        explanation: "Since R 3.6 the default is \"Rejection\". Old scripts, packages, or sessions can still set \"Rounding\".",
      },
      {
        id: "restore",
        prompt: "Why prefer withr::with_seed() over calling set.seed() inside a function?",
        options: [
          { id: "a", label: "It's faster", feedback: "Speed isn't the point. It's about side effects." },
          { id: "b", label: "It restores the caller's random stream and RNG settings afterwards" },
          { id: "c", label: "set.seed() is deprecated inside functions", feedback: "set.seed() is fine. Calling it inside a function silently resets the caller's stream." },
          { id: "d", label: "It generates better random numbers", feedback: "It uses the same generator. It just manages the state around your code." },
        ],
        correctOptionId: "b",
        explanation: "A function that reseeds the global stream changes every later random draw in the caller's analysis, a hidden side effect.",
      },
      {
        id: "pin",
        prompt: "Which call makes boot_ci(x, seed = 5) give the same interval in any session?",
        options: [
          { id: "a", label: "set.seed(5)", feedback: "The result would still depend on the caller's RNGkind() settings." },
          { id: "b", label: 'set.seed(5, kind = "Mersenne-Twister", normal.kind = "Inversion", sample.kind = "Rejection")' },
          { id: "c", label: 'RNGkind("default"); set.seed(5)', feedback: "Close, but it permanently changes the caller's settings and never restores them." },
          { id: "d", label: "Sys.setenv(SEED = 5)", feedback: "R's generator doesn't read environment variables." },
        ],
        correctOptionId: "b",
        explanation: "Pin every kind, then restore the caller's state (or do both with withr::with_seed()).",
      },
    ],
    challengeId: "research-mission.challenge-1",
    reward: { title: "Seeded and pinned", detail: "Your random results are reproducible in anyone's session, and you leave no trace behind." },
    check: { validatorId: "lesson-check:research-mission.lesson-1" },
    availability: available,
  },
  {
    id: "research-mission.lesson-2",
    kind: "lesson",
    missionId: "research-mission",
    title: "Every number computed",
    summary: "Computed reporting: build report text from data so it can never drift from the analysis.",
    estimatedMinutes: 9,
    xp: 20,
    briefing:
      "A report says the mean change was 4.2 points. The data was updated last week, and nobody updated the sentence. Replace pasted numbers with text that computes itself.",
    objectives: [
      "Explain why pasted numbers drift from analyses",
      "Compute a mean and t-based 95% CI on non-missing values",
      "Format report text with sprintf() so the session can't change it",
      "Generate one sentence per group, in a defined order",
    ],
    keyPoints: [
      "A number typed into a report is a copy; it drifts when the data changes.",
      "In Quarto or R Markdown, inline code computes values as the document renders.",
      "t-interval: mean ± qt(0.975, n − 1) × sd / √n, on non-missing values.",
      "sprintf() fixes the decimals and always uses \".\", whatever options(OutDec) says.",
    ],
    videoId: "research-mission.video",
    chapterIds: ["computed-reporting"],
    explanation: [
      {
        kind: "text",
        body: "Computed reporting means every number in the text is calculated from the data at the moment the report is built. Change the data, and the sentence changes with it. A typed number can't keep up.",
      },
      {
        kind: "code",
        code: 'x <- c(2.1, 3.4, NA, 1.8, 2.9)\nx <- x[!is.na(x)]\nn <- length(x); m <- mean(x)\nh <- qt(0.975, n - 1) * sd(x) / sqrt(n)\nsprintf("Mean change %.2f (95%% CI %.2f to %.2f; n = %d).", m, m - h, m + h, n)',
        output: '[1] "Mean change 2.55 (95% CI 1.38 to 3.72; n = 4)."',
        caption: "%% writes a literal percent sign. n counts the values actually used.",
        runnable: true,
      },
      {
        kind: "callout",
        tone: "tip",
        title: "Inline code in a report",
        body: "In Quarto, write `r week12_sentence(week12)` in the text (R Markdown uses the same syntax) and the sentence is computed every time the document renders. RQuest checks the function itself; rendering happens on your machine.",
      },
    ],
    walkthrough: {
      title: "From a pasted number to a computed sentence",
      code: 'enrolment_sentence <- function(df) {\n  "Enrolment: 48 participants at 3 sites."\n}',
      steps: [
        { title: "A copy, not a computation", note: "The text is correct only until the data changes.", highlight: [2] },
        {
          title: "Compute the counts",
          note: "Count participants and distinct sites from the data itself.",
          highlight: [2, 3],
          code: "enrolment_sentence <- function(df) {\n  n <- nrow(df)\n  sites <- length(unique(df$site))\n  sprintf(\"Enrolment: %d participants at %d sites.\", n, sites)\n}",
        },
        {
          title: "Handle missing values explicitly",
          note: "Decide what counts. Here, participants without a site aren't counted as a site.",
          highlight: [3],
          code: "enrolment_sentence <- function(df) {\n  n <- nrow(df)\n  sites <- length(unique(df$site[!is.na(df$site)]))\n  sprintf(\"Enrolment: %d participants at %d sites.\", n, sites)\n}",
        },
        {
          title: "Use it from the report",
          note: "In Quarto, the sentence goes inline as `r enrolment_sentence(adsl)`, so it can never disagree with the data.",
          highlight: [1],
          code: "The trial enrolled `r enrolment_sentence(adsl)`",
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "why-computed",
        prompt: "Why build report text with code instead of typing the numbers?",
        options: [
          { id: "a", label: "Typed numbers are copies that drift when the data or analysis changes" },
          { id: "b", label: "Code produces more decimal places", feedback: "You control the decimals either way. The issue is staying in sync with the data." },
          { id: "c", label: "Reviewers can't read typed numbers", feedback: "They can read them. They just can't trust that the numbers still match the analysis." },
          { id: "d", label: "sprintf() is faster than typing", feedback: "Speed isn't the point. Correctness after changes is." },
        ],
        correctOptionId: "a",
        explanation: "Computed text is recomputed on every render, so it always reflects the current data.",
      },
      {
        id: "t-interval",
        prompt: "For non-missing values x of length n, which is the 95% t-interval half-width?",
        options: [
          { id: "a", label: "1.96 * sd(x)", feedback: "That's missing the √n, and it uses the normal quantile instead of t with n − 1 df." },
          { id: "b", label: "qt(0.975, n - 1) * sd(x) / sqrt(n)" },
          { id: "c", label: "qt(0.95, n) * sd(x) / n", feedback: "Two-sided 95% needs the 0.975 quantile with n − 1 df, divided by √n, not n." },
          { id: "d", label: "sd(x) / sqrt(n)", feedback: "That's the standard error. Multiply by the t quantile to get the half-width." },
        ],
        correctOptionId: "b",
        explanation: "mean ± qt(0.975, n − 1) × sd / √n is the standard two-sided 95% t-interval.",
      },
      {
        id: "percent",
        prompt: 'In sprintf(), how do you print "95% CI"?',
        options: [
          { id: "a", label: 'sprintf("95%% CI")' },
          { id: "b", label: 'sprintf("95% CI")', feedback: "A lone % starts a format spec, so this is an error or garbles the output. Escape it as %%." },
          { id: "c", label: 'sprintf("95\\% CI")', feedback: "Backslash doesn't escape % in sprintf() format strings. Use %%." },
          { id: "d", label: 'paste0(95, "%", " CI") is the only way', feedback: "That works, but %% inside sprintf() keeps the whole sentence in one format string." },
        ],
        correctOptionId: "a",
        explanation: "%% is sprintf()'s escape for a literal percent sign.",
      },
    ],
    challengeId: "research-mission.challenge-2",
    reward: { title: "Numbers traced", detail: "Your report text can't drift from the data." },
    check: { validatorId: "lesson-check:research-mission.lesson-2" },
    availability: available,
  },
  {
    id: "research-mission.lesson-3",
    kind: "lesson",
    missionId: "research-mission",
    title: "The reviewer's re-run",
    summary: "An analysis set, a primary model, an audit sample, and output files that are byte-identical on every re-run.",
    estimatedMinutes: 12,
    xp: 20,
    briefing:
      "The reviewer will run your analysis from a clean session, in another directory, with different settings, and diff every output file against yours. Make every file identical, and make each one say what produced it.",
    objectives: [
      "Derive an analysis set and fit the primary model",
      "Draw a reproducible audit sample without disturbing the caller",
      "Write outputs that are byte-identical across re-runs",
      "Write a provenance note: R version, seed, input checksum",
    ],
    keyPoints: [
      "The analysis set and the model are code, not manual steps: rows with week12, change = week12 − baseline, lm(change ~ arm + baseline).",
      "Outputs must not depend on time, the working directory, options, or unpinned randomness.",
      "tools::md5sum() of each output file is the reviewer's check.",
      "Provenance travels with results: R version, seed, and an input checksum.",
    ],
    videoId: "research-mission.video",
    chapterIds: ["analysis", "outputs", "your-mission"],
    explanation: [
      {
        kind: "code",
        code: 'a <- raw[!is.na(raw$week12), ]\na$change <- a$week12 - a$baseline\na$arm <- factor(a$arm, levels = c("Placebo", "Treatment"))\nfit <- lm(change ~ arm + baseline, data = a)\nsummary(fit)$coefficients["armTreatment", ]',
        output: "n = 72  estimate = -3.481  SE = 1.166  95% CI [-5.808, -1.154]  p = 0.0039",
        caption: "Real results for the synthetic trial (formatted summary). Treatment lowers the change by about 3.5 points.",
      },
      {
        kind: "code",
        code: 'f1 <- tempfile(); f2 <- tempfile()\nres <- data.frame(term = "armTreatment", estimate = -3.4807)\nwrite.csv(res, f1, row.names = FALSE)\nwrite.csv(res, f2, row.names = FALSE)\nunname(tools::md5sum(f1)) == unname(tools::md5sum(f2))\nwrite.csv(cbind(res, run_at = format(Sys.time())), f2, row.names = FALSE)\nunname(tools::md5sum(f1)) == unname(tools::md5sum(f2))',
        output: "[1] TRUE\n[1] FALSE",
        caption: "Identical content gives identical checksums. One timestamp column breaks byte-identity.",
        runnable: true,
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Things that silently break a re-run",
        body: "Timestamps in outputs, Sys.time() in file names, unpinned random draws, relative paths, format() with session options, and reading whatever file happens to be in the working directory.",
      },
    ],
    walkthrough: {
      title: "A re-runnable run_pipeline()",
      code: 'run_pipeline <- function(raw_path) {\n  fit <- fit_model(read.csv(raw_path))\n  write.csv(tidy(fit), paste0("results_", Sys.Date(), ".csv"))\n}',
      steps: [
        { title: "Two hidden problems", note: "The file name changes every day, and the file lands in whatever the working directory is.", highlight: [3] },
        {
          title: "An explicit output directory and fixed names",
          note: "The caller chooses out_dir, the names never change, and row names are dropped so the content is stable.",
          highlight: [1, 3, 4],
          code: 'run_pipeline <- function(raw_path, out_dir) {\n  fit <- fit_model(utils::read.csv(raw_path))\n  dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)\n  utils::write.csv(tidy(fit), file.path(out_dir, "results.csv"), row.names = FALSE)\n}',
        },
        {
          title: "Write provenance alongside",
          note: "R version, seed, and the input's checksum, with no timestamp, so the file stays identical on every re-run.",
          highlight: [5, 6, 7, 8],
          code: 'run_pipeline <- function(raw_path, out_dir, seed = 20261112) {\n  fit <- fit_model(utils::read.csv(raw_path))\n  dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)\n  utils::write.csv(tidy(fit), file.path(out_dir, "results.csv"), row.names = FALSE)\n  writeLines(c(paste0("R: ", R.version.string),\n               paste0("seed: ", seed),\n               paste0("input_md5: ", unname(tools::md5sum(raw_path)))),\n             file.path(out_dir, "provenance.txt"))\n}',
        },
        {
          title: "The reviewer's check",
          note: "Run twice into two directories and compare checksums of every file.",
          highlight: [3],
          code: 'run_pipeline(raw, "run1"); run_pipeline(raw, "run2")\nf <- c("results.csv", "provenance.txt")\nidentical(unname(tools::md5sum(file.path("run1", f))), unname(tools::md5sum(file.path("run2", f))))',
          output: "[1] TRUE",
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "analysis-set",
        prompt: "The primary model is lm(change ~ arm + baseline). Which rows form the analysis set?",
        options: [
          { id: "a", label: "All participants, with missing week12 set to 0", feedback: "Imputing zero invents data and biases the estimate. The specification uses observed week12 values." },
          { id: "b", label: "Participants with a non-missing week12 value" },
          { id: "c", label: "Only the Treatment arm", feedback: "The model compares arms, so it needs both." },
          { id: "d", label: "A random 50% of participants", feedback: "Sampling is for the audit sample, not the analysis set." },
        ],
        correctOptionId: "b",
        explanation: "change = week12 − baseline needs an observed week12; those rows form the analysis set (72 in the synthetic trial).",
      },
      {
        id: "byte-identity",
        prompt: "Which output breaks byte-identical re-runs?",
        options: [
          { id: "a", label: "write.csv(results, file.path(out_dir, \"results.csv\"), row.names = FALSE)", feedback: "Fixed name, explicit directory, deterministic content. This stays identical." },
          { id: "b", label: "A provenance line with the input's MD5", feedback: "The input's checksum is the same on every re-run with the same file." },
          { id: "c", label: "A provenance line with format(Sys.time())" },
          { id: "d", label: "An audit sample drawn with withr::with_seed() and pinned kinds", feedback: "Pinned and seeded, so it gives the same participants every time." },
        ],
        correctOptionId: "c",
        explanation: "A timestamp differs on every run. Record the seed and input checksum instead.",
      },
      {
        id: "verify",
        prompt: "How does a reviewer best confirm your analysis reproduced?",
        options: [
          { id: "a", label: "Eyeball the printed estimates", feedback: "Printing rounds, and it only covers what you print. Compare the files themselves." },
          { id: "b", label: "Re-run from a clean session and compare checksums of every output file" },
          { id: "c", label: "Check that the script ran without errors", feedback: "A script can run cleanly and still produce different numbers." },
          { id: "d", label: "Compare file sizes", feedback: "Different content can have the same size. Checksums compare the actual bytes." },
        ],
        correctOptionId: "b",
        explanation: "Matching tools::md5sum() values prove every output file is byte-for-byte identical.",
      },
    ],
    challengeId: "research-mission.boss",
    reward: { title: "Reviewer-ready", detail: "Your analysis re-runs byte-for-byte, and says what produced it." },
    check: { validatorId: "lesson-check:research-mission.lesson-3" },
    availability: available,
  },
];
