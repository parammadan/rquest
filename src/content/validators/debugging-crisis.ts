import type { ValidatorDefinition } from "../../domain/evaluation.ts";
import { rVector, SESSION_HELPERS } from "./shared.ts";

/*
 * World 3 validators: environment debugging. Each check re-runs the
 * learner's function under a different session configuration (attach
 * order, options, working directory) — the usual causes of
 * "works on my machine".
 */

const TRIAL = String.raw`
set.seed(3)
trial <- data.frame(
  id = sprintf("P%03d", 1:24),
  arm = rep(c("Placebo", "Treatment"), 12),
  site = rep(c("BOS-01", "NYC-02", "CHI-03"), each = 8),
  outcome = round(rnorm(24, 11, 2), 1)
)
trial$outcome[c(5, 14, 21)] <- NA
`;

const ATTACH_MASS_LAST = String.raw`
suppressPackageStartupMessages({
  library(dplyr, warn.conflicts = FALSE)
  if ("package:MASS" %in% search()) detach("package:MASS")
  library(MASS, warn.conflicts = FALSE)
})
`;

const OUTCOME_REF = String.raw`
.ref_outcomes <- function(df) {
  r <- df[!is.na(df$outcome), c("arm", "outcome")]
  rownames(r) <- NULL
  r
}
.same_rows <- function(got, df) {
  got <- as.data.frame(got)
  exp <- .ref_outcomes(df)
  base::identical(names(got), c("arm", "outcome")) && nrow(got) == nrow(exp) &&
    base::identical(as.character(got$arm), exp$arm) && isTRUE(base::all.equal(as.numeric(got$outcome), exp$outcome))
}
`;

export const maskedValidator: ValidatorDefinition = {
  validatorId: "webr:output-match:debugging-crisis.challenge-1",
  challengeId: "debugging-crisis.challenge-1",
  timeoutMs: 20_000,
  setup: SESSION_HELPERS + ATTACH_MASS_LAST + TRIAL,
  checks: [
    {
      id: "defined",
      description: "outcome_table() is defined as a function",
      hint: "Keep the outcome_table <- function(df) { ... } definition.",
      expr: `is.function(outcome_table)`,
    },
    {
      id: "works",
      description: "Returns arm and outcome, without missing outcomes — with MASS attached after dplyr",
      hint: "MASS::select() is masking dplyr::select(). Check with environment(select) or conflicts(), then call dplyr::select() explicitly.",
      expr: `local({ ${OUTCOME_REF}; .same_rows(outcome_table(trial), trial) })`,
    },
    {
      id: "no-dplyr",
      description: "Still works when dplyr isn't attached at all",
      hint: "Without dplyr attached, bare filter() means stats::filter(). Qualify every dplyr verb: dplyr::filter().",
      expr: `local({ ${OUTCOME_REF}; .without_dplyr(function() .same_rows(outcome_table(trial), trial)) })`,
    },
    {
      id: "unseen",
      description: "Works on a different dataset",
      hint: "Use the df argument rather than trial inside the function.",
      expr: `local({
        ${OUTCOME_REF}
        d <- data.frame(arm = c("A", "B", "A", "C"), outcome = c(NA, 2.5, 3.1, 4), site = "X")
        .same_rows(outcome_table(d), d)
      })`,
    },
  ],
};

export const scopingValidator: ValidatorDefinition = {
  validatorId: "webr:output-match:debugging-crisis.challenge-2",
  challengeId: "debugging-crisis.challenge-2",
  timeoutMs: 10_000,
  setup: SESSION_HELPERS + `threshold <- 0.05`,
  checks: [
    {
      id: "signature",
      description: "flag_signals(p_values, alpha = 0.05) — alpha defaults to 0.05",
      hint: "Give alpha a default: function(p_values, alpha = 0.05).",
      expr: `is.function(flag_signals) && base::identical(names(formals(flag_signals)), c("p_values", "alpha")) && base::identical(formals(flag_signals)$alpha, 0.05)`,
    },
    {
      id: "uses-alpha",
      description: "Flags p-values below alpha",
      hint: "Compare against alpha, not threshold.",
      expr: `base::identical(flag_signals(c(0.01, 0.04, 0.2), alpha = 0.025), c(TRUE, FALSE, FALSE))`,
    },
    {
      id: "ignores-global",
      description: "Changing a global threshold variable has no effect",
      hint: "R looks up free variables in the function's enclosing environment — that's how threshold leaked in.",
      expr: `local({
        old <- get("threshold", envir = .learner_env)
        assign("threshold", 0.99, envir = .learner_env)
        on.exit(assign("threshold", old, envir = .learner_env))
        base::identical(flag_signals(c(0.01, 0.5)), c(TRUE, FALSE))
      })`,
    },
    {
      id: "pure",
      description: "Reads no variables from outside the function",
      hint: "Everything the function uses should arrive through its arguments.",
      expr: `length(.free_vars(flag_signals)) == 0L`,
    },
    {
      id: "na",
      description: "Missing p-values stay NA",
      hint: "Don't replace NA with FALSE — an unknown p-value isn't a non-signal.",
      expr: `base::identical(flag_signals(c(NA, 0.01)), c(NA, TRUE))`,
    },
  ],
};

const VISITS = [
  "id,arm,outcome",
  "P001,Placebo,10.2",
  "P002,Treatment,12.9",
  "P003,Placebo,NA",
  "P004,Treatment,13.4",
  "P005,Placebo,9.7",
  "P006,Treatment,12.1",
  "P007,Placebo,11.05",
  "P008,Treatment,NA",
  "P009,Placebo,10.6",
  "P010,Treatment,14.25",
];

const REPORT_REF = String.raw`
.ref_table <- function(path) {
  d <- utils::read.csv(path, stringsAsFactors = FALSE)
  d <- d[!is.na(d$outcome), ]
  arms <- sort(unique(d$arm))
  m <- vapply(arms, function(a) mean(d$outcome[d$arm == a]), numeric(1), USE.NAMES = FALSE)
  s <- vapply(arms, function(a) stats::sd(d$outcome[d$arm == a]), numeric(1), USE.NAMES = FALSE)
  n <- vapply(arms, function(a) sum(d$arm == a), integer(1), USE.NAMES = FALSE)
  data.frame(arm = arms, n = n, mean = m, sd = s, label = sprintf("%.2f (%.2f)", m, s))
}
.same_table <- function(r, path) {
  got <- as.data.frame(r$table)
  exp <- .ref_table(path)
  all(c("arm", "n", "mean", "sd", "label") %in% names(got)) && nrow(got) == nrow(exp) &&
    base::identical(as.character(got$arm), exp$arm) &&
    isTRUE(base::all.equal(as.numeric(got$n), as.numeric(exp$n))) &&
    isTRUE(base::all.equal(as.numeric(got$mean), exp$mean)) &&
    isTRUE(base::all.equal(as.numeric(got$sd), exp$sd)) &&
    base::identical(as.character(got$label), exp$label)
}
.data_dir <- normalizePath("data")
.visits <- file.path(.data_dir, "visits.csv")
`;

export const worksOnMyMachineValidator: ValidatorDefinition = {
  validatorId: "webr:reproducibility-diff:debugging-crisis.boss",
  challengeId: "debugging-crisis.boss",
  timeoutMs: 30_000,
  setup:
    SESSION_HELPERS +
    ATTACH_MASS_LAST +
    `dir.create("data")\nwriteLines(${rVector(VISITS)}, "data/visits.csv")\n` +
    REPORT_REF,
  checks: [
    {
      id: "defined",
      description: "run_report(data_dir) is defined",
      hint: "Keep the run_report <- function(data_dir) { ... } signature.",
      expr: `is.function(run_report)`,
    },
    {
      id: "table",
      description: "Summary table is correct: arm, n, mean, sd, and a label like \"10.39 (0.54)\"",
      hint: "n counts non-missing outcomes; label is sprintf(\"%.2f (%.2f)\", mean, sd).",
      expr: `.same_table(run_report(.data_dir), .visits)`,
    },
    {
      id: "wd",
      description: "Works from any working directory",
      hint: "Build the path from the argument: file.path(data_dir, \"visits.csv\").",
      expr: `.elsewhere(function() .same_table(run_report(.data_dir), .visits))`,
    },
    {
      id: "options",
      description: "Identical output under different options(OutDec, digits)",
      hint: "format() follows options(OutDec); sprintf() always uses \".\".",
      expr: `.with_hostile_options(function() .same_table(run_report(.data_dir), .visits))`,
    },
    {
      id: "attached",
      description: "Works whether or not dplyr is attached",
      hint: "Qualify dplyr calls (dplyr::filter) or use base R — don't rely on library() having been called.",
      expr: `.without_dplyr(function() .same_table(run_report(.data_dir), .visits))`,
    },
    {
      id: "no-side-effects",
      description: "Leaves the caller's options and working directory unchanged",
      hint: "If you change options() or setwd(), restore them with on.exit().",
      expr: `local({
        before <- list(options()[c("OutDec", "digits", "scipen", "stringsAsFactors")], getwd())
        run_report(.data_dir)
        base::identical(before, list(options()[c("OutDec", "digits", "scipen", "stringsAsFactors")], getwd()))
      })`,
    },
    {
      id: "provenance",
      description: "Records provenance: R version, dplyr version, and the input file's MD5",
      hint: "session = list(r_version = R.version.string, packages = c(dplyr = ...), input_md5 = unname(tools::md5sum(path))).",
      expr: `local({
        s <- run_report(.data_dir)$session
        base::identical(s$r_version, R.version.string) &&
          base::identical(unname(s$packages[["dplyr"]]), as.character(utils::packageVersion("dplyr"))) &&
          base::identical(unname(s$input_md5), unname(tools::md5sum(.visits)))
      })`,
    },
  ],
};
