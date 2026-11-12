import type { ValidatorDefinition } from "../../domain/evaluation.ts";

/*
 * World 4 validators.
 * - challenge-1 is mutation testing: the learner's testthat tests must pass
 *   against the correct function and fail against each deliberately broken
 *   copy ("mutant").
 * - challenge-2 is checked with a hidden testthat suite (expect_error with
 *   condition classes and messages).
 * - The boss is independent double programming of a summary table plus a
 *   discrepancy report, checked against a reference and on unseen data.
 */

const MUTATION_SETUP = String.raw`
suppressPackageStartupMessages(library(testthat))

.correct <- function(df) {
  if (nrow(df) == 0) stop("df has no rows", call. = FALSE)
  arms <- sort(unique(as.character(df$arm)))
  out <- lapply(arms, function(a) {
    x <- df$outcome[df$arm == a]
    x <- x[!is.na(x)]
    data.frame(arm = a, n = length(x), mean = mean(x), sd = stats::sd(x))
  })
  do.call(rbind, out)
}
.mutants <- list(
  n_counts_na = function(df) {
    r <- .correct(df)
    r$n <- vapply(r$arm, function(a) sum(df$arm == a), integer(1), USE.NAMES = FALSE)
    r
  },
  na_propagates = function(df) {
    r <- .correct(df)
    r$mean <- vapply(r$arm, function(a) mean(df$outcome[df$arm == a]), numeric(1), USE.NAMES = FALSE)
    r
  },
  empty_accepted = function(df) {
    if (nrow(df) == 0) return(data.frame(arm = character(), n = integer(), mean = numeric(), sd = numeric()))
    .correct(df)
  },
  single_dropped = function(df) {
    r <- .correct(df)
    r[!is.na(r$sd), , drop = FALSE]
  }
)

# The function learners test, as they see it.
summarise_arm <- .correct

# While experimenting, report test results instead of stopping at the first failure.
test_that <- function(desc, code) {
  call <- substitute(testthat::test_that(desc, CODE), list(desc = desc, CODE = substitute(code)))
  ok <- tryCatch(eval(call, parent.frame()), error = function(e) {
    message("Test failed: ", desc, " — ", conditionMessage(e))
    FALSE
  })
  invisible(ok)
}

# Run the learner's test code with a given implementation of summarise_arm().
.run_tests <- function(impl) {
  f <- tempfile(fileext = ".R")
  # .rq_code is provided by the grader's trusted scope (a copy learner code can't rebind).
  writeLines(.rq_code, f)
  e <- new.env(parent = globalenv())
  e$summarise_arm <- impl
  tryCatch(
    as.data.frame(testthat::test_file(f, env = e, reporter = "silent", stop_on_failure = FALSE)),
    error = function(err) NULL
  )
}
.all_pass <- function(res) !is.null(res) && nrow(res) > 0 && sum(res$failed) == 0 && !any(res$error)
.caught <- function(res) !is.null(res) && (sum(res$failed) > 0 || any(res$error))
`;

const caught = (mutant: string) => `.caught(.run_tests(.mutants[["${mutant}"]]))`;

export const mutationValidator: ValidatorDefinition = {
  validatorId: "webr:mutation-testing:quality-control.challenge-1",
  challengeId: "quality-control.challenge-1",
  timeoutMs: 45_000,
  setup: MUTATION_SETUP,
  checks: [
    {
      id: "green",
      description: "Your tests pass against the correct summarise_arm(), with at least 3 expectations",
      hint: "Run your tests first — every expectation should hold for the real function.",
      expr: `local({ r <- .run_tests(.correct); .all_pass(r) && sum(r$nb) >= 3 })`,
    },
    {
      id: "n-na",
      description: "Catches a mutant where n counts missing outcomes",
      hint: "Test an arm with an NA outcome and check its n.",
      expr: caught("n_counts_na"),
    },
    {
      id: "mean-na",
      description: "Catches a mutant where a missing outcome makes the mean NA",
      hint: "Check the mean of an arm that contains NA.",
      expr: caught("na_propagates"),
    },
    {
      id: "empty",
      description: "Catches a mutant that silently accepts empty input",
      hint: "expect_error() on a zero-row data frame.",
      expr: caught("empty_accepted"),
    },
    {
      id: "single",
      description: "Catches a mutant that drops arms with a single observation",
      hint: "Include an arm with exactly one non-missing outcome and check it's still in the result.",
      expr: caught("single_dropped"),
    },
  ],
};

const VALIDATE_SETUP = String.raw`
suppressPackageStartupMessages(library(testthat))
trial_ok <- data.frame(id = c("P001", "P002", "P003"), arm = c("A", "B", "A"), outcome = c(1.2, 3.4, 2.2))
.fails <- function(expr, pattern) {
  isTRUE(tryCatch({
    testthat::expect_error(expr, class = "rquest_invalid_input", regexp = pattern)
    TRUE
  }, error = function(e) FALSE))
}
`;

export const validateInputValidator: ValidatorDefinition = {
  validatorId: "webr:testthat-suite:quality-control.challenge-2",
  challengeId: "quality-control.challenge-2",
  timeoutMs: 20_000,
  setup: VALIDATE_SETUP,
  checks: [
    {
      id: "valid",
      description: "Valid data passes silently and is returned unchanged",
      hint: "End with invisible(df) and raise nothing for good input.",
      expr: `isTRUE(tryCatch({ testthat::expect_silent(r <- validate_trial(trial_ok)); base::identical(r, trial_ok) }, error = function(e) FALSE))`,
    },
    {
      id: "not-df",
      description: "Non–data-frame input raises an rquest_invalid_input error",
      hint: "rlang::abort(\"...\", class = \"rquest_invalid_input\") — stopifnot() can't set a class.",
      expr: `.fails(validate_trial(list(id = "P001")), "data frame")`,
    },
    {
      id: "columns",
      description: "A missing column is reported by name",
      hint: "Find which of id, arm, outcome are missing and put them in the message.",
      expr: `.fails(validate_trial(trial_ok[, c("id", "arm")]), "outcome")`,
    },
    {
      id: "numeric",
      description: "A non-numeric outcome is rejected, mentioning \"numeric\"",
      hint: "is.numeric(df$outcome).",
      expr: `.fails(validate_trial(transform(trial_ok, outcome = as.character(outcome))), "numeric")`,
    },
    {
      id: "duplicates",
      description: "Duplicate ids are rejected, naming the duplicated id",
      hint: "unique(df$id[duplicated(df$id)]) gives the offenders; paste them into the message.",
      expr: `.fails(validate_trial(rbind(trial_ok, trial_ok[2, ])), "P002")`,
    },
    {
      id: "empty",
      description: "Zero rows are rejected, mentioning \"no rows\"",
      hint: "Check nrow(df) == 0 — after the column checks.",
      expr: `.fails(validate_trial(trial_ok[0, ]), "no rows")`,
    },
  ],
};

const QC_SETUP = String.raw`
.make_adsl <- function(seed, n) {
  set.seed(seed)
  data.frame(
    USUBJID = sprintf("RQ-%03d", seq_len(n)),
    ARM = sample(c("Placebo", "Treatment"), n, replace = TRUE),
    AGE = sample(24:79, n, replace = TRUE),
    SEX = sample(c("F", "M"), n, replace = TRUE)
  )
}
.ref_table <- function(adsl) {
  arms <- sort(unique(adsl$ARM))
  do.call(rbind, lapply(arms, function(a) {
    d <- adsl[adsl$ARM == a, ]
    data.frame(arm = a, n = nrow(d), age_mean = mean(d$AGE), age_sd = stats::sd(d$AGE),
               pct_female = 100 * mean(d$SEX == "F"))
  }))
}
.same_table <- function(got, exp) {
  got <- as.data.frame(got)
  cols <- c("arm", "n", "age_mean", "age_sd", "pct_female")
  if (!all(cols %in% names(got)) || nrow(got) != nrow(exp)) return(FALSE)
  got <- got[order(as.character(got$arm)), ]
  base::identical(as.character(got$arm), exp$arm) &&
    all(vapply(cols[-1], function(cl) isTRUE(base::all.equal(as.numeric(got[[cl]]), as.numeric(exp[[cl]]), tolerance = 1e-10)), logical(1)))
}
.discrepancies <- function(r) {
  r <- as.data.frame(r)
  if (!all(c("arm", "column") %in% names(r))) return(NULL)
  sort(paste(r$arm, r$column, sep = "/"))
}

adsl <- .make_adsl(2026, 60)
# The production table. Its programmer made one mistake.
prod <- .ref_table(adsl)
prod$pct_female[prod$arm == "Treatment"] <- 100 * sum(adsl$SEX == "F" & adsl$ARM == "Treatment") / nrow(adsl)
`;

export const independentQcValidator: ValidatorDefinition = {
  validatorId: "webr:output-match:quality-control.boss",
  challengeId: "quality-control.boss",
  timeoutMs: 20_000,
  setup: QC_SETUP,
  checks: [
    {
      id: "defined",
      description: "qc_demographics() and compare_tables() are defined",
      hint: "Define both functions with the signatures in the starter.",
      expr: `is.function(qc_demographics) && is.function(compare_tables)`,
    },
    {
      id: "qc-table",
      description: "Your QC table is correct: one row per arm with n, age_mean, age_sd, pct_female",
      hint: "pct_female is a percentage (0–100) of the arm's subjects.",
      expr: `.same_table(qc_demographics(adsl), .ref_table(adsl))`,
    },
    {
      id: "qc-unseen",
      description: "QC table is correct on an unseen dataset",
      hint: "Don't assume particular arms or subject counts.",
      expr: `local({ a <- .make_adsl(7, 41); .same_table(qc_demographics(a), .ref_table(a)) })`,
    },
    {
      id: "finds-bug",
      description: "compare_tables() finds the production discrepancy — and nothing else",
      hint: "Compare cell by cell; report arm and column for each mismatch beyond the tolerance.",
      expr: `base::identical(.discrepancies(compare_tables(prod, qc_demographics(adsl))), "Treatment/pct_female")`,
    },
    {
      id: "clean",
      description: "Identical tables produce zero discrepancies",
      hint: "Return a zero-row data frame (with the same columns) when everything matches.",
      expr: `local({ r <- as.data.frame(compare_tables(.ref_table(adsl), .ref_table(adsl))); nrow(r) == 0L && all(c("arm", "column", "prod", "qc") %in% names(r)) })`,
    },
    {
      id: "tolerance",
      description: "Differences below the tolerance are not flagged",
      hint: "Use abs(prod - qc) > tolerance, not ==.",
      expr: `local({
        t <- .ref_table(adsl)
        t2 <- t
        t2$age_mean <- t2$age_mean + 1e-12
        nrow(as.data.frame(compare_tables(t, t2))) == 0L &&
          nrow(as.data.frame(compare_tables(t, t2, tolerance = 1e-14))) == nrow(t)
      })`,
    },
    {
      id: "unseen-pair",
      description: "Finds every discrepancy in an unseen production/QC pair",
      hint: "Loop over every numeric column, not just pct_female.",
      expr: `local({
        a <- .make_adsl(99, 50)
        p <- .ref_table(a)
        p$n[p$arm == "Placebo"] <- p$n[p$arm == "Placebo"] + 1L
        p$age_sd[p$arm == "Treatment"] <- p$age_sd[p$arm == "Treatment"] * 1.01
        base::identical(.discrepancies(compare_tables(p, .ref_table(a))), c("Placebo/n", "Treatment/age_sd"))
      })`,
    },
  ],
};

