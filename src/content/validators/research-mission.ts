import type { ValidatorDefinition } from "../../domain/evaluation.ts";
import { SESSION_HELPERS } from "./shared.ts";

/*
 * World 5 validators: reproducibility. Results are compared against hidden
 * reference computations, then re-checked under hostile RNG kinds, options,
 * and working directories; the boss compares output files byte-for-byte
 * across two independent runs.
 */

const BOOT_SETUP = String.raw`
x_obs <- c(12.1, 9.8, 11.4, 13.0, 10.7, NA, 12.6, 11.9, 9.5, 14.2, 10.1, 12.8, 11.0, 13.6, 10.9)
.ref_boot <- function(x, B, seed) {
  set.seed(seed, kind = "Mersenne-Twister", normal.kind = "Inversion", sample.kind = "Rejection")
  x <- x[!is.na(x)]
  m <- replicate(B, mean(sample(x, replace = TRUE)))
  c(stats::quantile(m, 0.025, names = FALSE), stats::quantile(m, 0.975, names = FALSE))
}
.near <- function(a, b) isTRUE(base::all.equal(unname(as.numeric(a)), unname(as.numeric(b)), tolerance = 1e-12))
`;

export const bootstrapValidator: ValidatorDefinition = {
  validatorId: "webr:reproducibility-diff:research-mission.challenge-1",
  challengeId: "research-mission.challenge-1",
  timeoutMs: 30_000,
  setup: SESSION_HELPERS + BOOT_SETUP,
  checks: [
    {
      id: "shape",
      description: "boot_ci(x, B, seed) returns c(lower = , upper = )",
      hint: "Return a named numeric vector of length 2.",
      expr: `local({ r <- boot_ci(x_obs, B = 200, seed = 1); is.numeric(r) && base::identical(names(r), c("lower", "upper")) })`,
    },
    {
      id: "spec",
      description: "Matches the specified algorithm exactly",
      hint: "set.seed(seed, kind = \"Mersenne-Twister\", normal.kind = \"Inversion\", sample.kind = \"Rejection\"), drop NAs, then replicate() and quantile().",
      expr: `local({ ref <- .ref_boot(x_obs, 500, 7); .near(boot_ci(x_obs, B = 500, seed = 7), ref) })`,
    },
    {
      id: "repeatable",
      description: "Same seed gives identical results; a different seed doesn't",
      hint: "The seed argument must drive the random numbers.",
      expr: `base::identical(boot_ci(x_obs, B = 300, seed = 2), boot_ci(x_obs, B = 300, seed = 2)) && !base::identical(boot_ci(x_obs, B = 300, seed = 2), boot_ci(x_obs, B = 300, seed = 3))`,
    },
    {
      id: "rng-kind",
      description: "Unaffected by the caller's RNGkind() (e.g. sample.kind = \"Rounding\" from R < 3.6)",
      hint: "set.seed(seed) alone uses whatever RNG kind is active — pin kind, normal.kind, and sample.kind.",
      expr: `local({ ref <- .ref_boot(x_obs, 300, 5); .with_hostile_rng(function() .near(boot_ci(x_obs, B = 300, seed = 5), ref)) })`,
    },
    {
      id: "restores",
      description: "Leaves the caller's random-number stream and RNG kind untouched",
      hint: "Save RNGkind() and .Random.seed, restore them with on.exit() — or use withr::with_seed().",
      expr: `local({
        set.seed(42)
        before <- .rng_snapshot()
        boot_ci(x_obs, B = 100, seed = 9)
        base::identical(.rng_snapshot(), before)
      })`,
    },
    {
      id: "unseen",
      description: "Correct on unseen data",
      hint: "Don't hard-code anything about x_obs.",
      expr: `local({ y <- c(1.5, NA, 2.25, 3.0, 2.8, 1.9, NA, 2.6); ref <- .ref_boot(y, 250, 11); .near(boot_ci(y, B = 250, seed = 11), ref) })`,
    },
  ],
};

const SENTENCE_SETUP = String.raw`
.make_week12 <- function(seed, arms, n) {
  set.seed(seed)
  d <- data.frame(arm = rep(arms, length.out = n), change = round(rnorm(n, 2, 3), 2))
  d$change[sample(n, 3)] <- NA
  d
}
week12 <- .make_week12(12, c("Treatment", "Placebo"), 57)
.ref_sentence <- function(df) {
  arms <- sort(unique(df$arm))
  parts <- vapply(arms, function(a) {
    x <- df$change[df$arm == a & !is.na(df$change)]
    n <- length(x); m <- mean(x); h <- stats::qt(0.975, n - 1) * stats::sd(x) / sqrt(n)
    sprintf("%s: mean change %.2f (95%% CI %.2f to %.2f; n = %d).", a, m, m - h, m + h, n)
  }, character(1))
  paste(parts, collapse = " ")
}
`;

export const traceNumbersValidator: ValidatorDefinition = {
  validatorId: "webr:output-match:research-mission.challenge-2",
  challengeId: "research-mission.challenge-2",
  timeoutMs: 15_000,
  setup: SESSION_HELPERS + SENTENCE_SETUP,
  checks: [
    {
      id: "shape",
      description: "week12_sentence(df) returns a single string",
      hint: "Combine the per-arm sentences with paste(..., collapse = \" \").",
      expr: `local({ r <- week12_sentence(week12); is.character(r) && length(r) == 1L })`,
    },
    {
      id: "exact",
      description: "Sentence matches the specified format and numbers exactly",
      hint: "Per arm, alphabetically: \"<arm>: mean change <m> (95% CI <lo> to <hi>; n = <n>).\" — t-interval, 2 decimals.",
      expr: `base::identical(week12_sentence(week12), .ref_sentence(week12))`,
    },
    {
      id: "unseen",
      description: "Every number is computed: correct on an unseen three-arm dataset",
      hint: "Nothing may be pasted in by hand — derive arms, n, means, and CIs from df.",
      expr: `local({ d <- .make_week12(4, c("Low dose", "High dose", "Placebo"), 45); base::identical(week12_sentence(d), .ref_sentence(d)) })`,
    },
    {
      id: "options",
      description: "Identical under options(OutDec = \",\")",
      hint: "sprintf() always uses \".\"; format() and formatC() follow options(OutDec).",
      expr: `.with_hostile_options(function() base::identical(week12_sentence(week12), .ref_sentence(week12)))`,
    },
  ],
};

const ANALYSIS_SETUP = String.raw`
.make_raw <- function(seed, n, path) {
  set.seed(seed)
  arm <- rep(c("Placebo", "Treatment"), length.out = n)
  baseline <- round(rnorm(n, 50, 8), 1)
  week12 <- round(baseline - 2 - 4 * (arm == "Treatment") + rnorm(n, 0, 5), 1)
  week12[sample(n, max(1, n %/% 10))] <- NA
  utils::write.csv(data.frame(participant = sprintf("RQ-%03d", seq_len(n)), arm, baseline, week12), path, row.names = FALSE)
  normalizePath(path)
}
.ref_analysis <- function(path, seed) {
  raw <- utils::read.csv(path, stringsAsFactors = FALSE)
  a <- raw[!is.na(raw$week12), ]
  a$change <- a$week12 - a$baseline
  a$arm <- factor(a$arm, levels = c("Placebo", "Treatment"))
  fit <- stats::lm(change ~ arm + baseline, data = a)
  co <- summary(fit)$coefficients["armTreatment", ]
  ci <- stats::confint(fit)["armTreatment", ]
  set.seed(seed, kind = "Mersenne-Twister", normal.kind = "Inversion", sample.kind = "Rejection")
  list(
    results = data.frame(term = "armTreatment", estimate = co[[1]], std_error = co[[2]],
                         ci_low = ci[[1]], ci_high = ci[[2]], p_value = co[[4]], n = nrow(a)),
    audit = sort(sample(a$participant, 5))
  )
}
.same_results <- function(got, exp) {
  got <- as.data.frame(got)
  cols <- c("estimate", "std_error", "ci_low", "ci_high", "p_value", "n")
  all(c("term", cols) %in% names(got)) && nrow(got) == 1L &&
    base::identical(as.character(got$term), "armTreatment") &&
    all(vapply(cols, function(cl) isTRUE(base::all.equal(as.numeric(got[[cl]]), as.numeric(exp[[cl]]), tolerance = 1e-8)), logical(1)))
}
.outputs <- c("results.csv", "audit_sample.csv", "provenance.txt")
.fresh_dir <- function() { d <- tempfile("out-"); d }
raw_path <- .make_raw(5, 80, "raw_trial.csv")
`;

export const reviewerRerunValidator: ValidatorDefinition = {
  validatorId: "webr:reproducibility-diff:research-mission.boss",
  challengeId: "research-mission.boss",
  timeoutMs: 45_000,
  setup: SESSION_HELPERS + ANALYSIS_SETUP,
  checks: [
    {
      id: "defined",
      description: "run_analysis(raw_path, out_dir, seed = 20261112) is defined",
      hint: "Keep the signature from the starter, including the default seed.",
      expr: `is.function(run_analysis) && base::identical(formals(run_analysis)$seed, 20261112)`,
    },
    {
      id: "model",
      description: "Primary model is correct: lm(change ~ arm + baseline), treatment estimate, SE, 95% CI, p, n",
      hint: "Analysis set = rows with non-missing week12; change = week12 - baseline; report the armTreatment row.",
      expr: `local({ r <- run_analysis(raw_path, .fresh_dir()); .same_results(r$results, .ref_analysis(raw_path, 20261112)$results) })`,
    },
    {
      id: "audit",
      description: "Audit sample of 5 participants is reproducible and matches the specification",
      hint: "Pin the RNG as in the bootstrap challenge, then sort(sample(analysis$participant, 5)).",
      expr: `local({ r <- run_analysis(raw_path, .fresh_dir(), seed = 77); base::identical(as.character(r$audit), .ref_analysis(raw_path, 77)$audit) })`,
    },
    {
      id: "files",
      description: "Writes results.csv, audit_sample.csv, and provenance.txt (creating out_dir if needed)",
      hint: "dir.create(out_dir, recursive = TRUE, showWarnings = FALSE), then write.csv(..., row.names = FALSE).",
      expr: `local({ d <- .fresh_dir(); run_analysis(raw_path, d); all(file.exists(file.path(d, .outputs))) })`,
    },
    {
      id: "rerun",
      description: "A reviewer's re-run — other directory, options, and RNG kind — produces byte-identical files",
      hint: "Nothing in the outputs may depend on the session: no timestamps, no format() with OutDec, no unpinned RNG.",
      expr: `local({
        d1 <- .fresh_dir(); d2 <- .fresh_dir()
        run_analysis(raw_path, d1)
        .elsewhere(function() .with_hostile_options(function() .with_hostile_rng(function() run_analysis(raw_path, d2))))
        f1 <- file.path(d1, .outputs); f2 <- file.path(d2, .outputs)
        all(file.exists(c(f1, f2))) && base::identical(unname(tools::md5sum(f1)), unname(tools::md5sum(f2)))
      })`,
    },
    {
      id: "provenance",
      description: "provenance.txt records the R version, the seed, and the input file's MD5",
      hint: "Lines like paste0(\"R: \", R.version.string), paste0(\"seed: \", seed), paste0(\"input_md5: \", md5).",
      expr: `local({
        d <- .fresh_dir(); run_analysis(raw_path, d)
        p <- readLines(file.path(d, "provenance.txt"))
        any(grepl(R.version.string, p, fixed = TRUE)) && any(grepl("20261112", p, fixed = TRUE)) &&
          any(grepl(unname(tools::md5sum(raw_path)), p, fixed = TRUE))
      })`,
    },
    {
      id: "clean-session",
      description: "Leaves the caller's RNG stream and options untouched",
      hint: "Restore .Random.seed and RNGkind() with on.exit(), or wrap the sampling in withr::with_seed().",
      expr: `local({
        set.seed(1)
        before <- list(.rng_snapshot(), options()[c("OutDec", "digits")])
        run_analysis(raw_path, .fresh_dir())
        base::identical(list(.rng_snapshot(), options()[c("OutDec", "digits")]), before)
      })`,
    },
    {
      id: "unseen",
      description: "Correct on an unseen trial export",
      hint: "Derive everything from the file at raw_path.",
      expr: `local({
        p <- .make_raw(31, 64, tempfile(fileext = ".csv"))
        r <- run_analysis(p, .fresh_dir())
        .same_results(r$results, .ref_analysis(p, 20261112)$results)
      })`,
    },
  ],
};
