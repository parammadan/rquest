import type { ValidatorDefinition } from "../../domain/evaluation.ts";

/*
 * World 1 validators. Each check is an R expression evaluated after the
 * learner's code, in a child of the learner's environment; it must return
 * TRUE. Checks include unseen inputs so hard-coded answers fail.
 * All data is synthetic.
 */

export const cleanSiteValidator: ValidatorDefinition = {
  validatorId: "webr:output-match:data-lab.challenge-1",
  challengeId: "data-lab.challenge-1",
  timeoutMs: 10_000,
  setup: `sites <- c("BOS-01", "bos01", "NYC-02", " nyc-02", NA, "CHI-03")`,
  checks: [
    {
      id: "defined",
      description: "clean_site() is defined as a function",
      hint: "Define it with clean_site <- function(x) { ... }.",
      expr: `is.function(clean_site)`,
    },
    {
      id: "sample",
      description: "Cleans the preloaded sites vector",
      hint: "Expected BOS-01, BOS-01, NYC-02, NYC-02, NA, CHI-03. Try trimws(), toupper(), and sub().",
      expr: `base::identical(clean_site(sites), c("BOS-01", "BOS-01", "NYC-02", "NYC-02", NA, "CHI-03"))`,
    },
    {
      id: "unseen",
      description: "Works on site codes it hasn't seen",
      hint: "Don't hard-code values. A pattern like ^([A-Z]+)-?([0-9]+)$ handles any site.",
      expr: `base::identical(clean_site(c("sea07", "  LAX-11 ", "Mia12")), c("SEA-07", "LAX-11", "MIA-12"))`,
    },
    {
      id: "na",
      description: "Keeps missing values as NA and preserves length",
      hint: "Make sure NA isn't turned into the string \"NA\".",
      expr: `local({ r <- clean_site(c(NA, "den04")); length(r) == 2L && is.na(r[1]) && base::identical(r[2], "DEN-04") })`,
    },
    {
      id: "empty",
      description: "Returns character(0) for empty input",
      hint: "Vectorised base functions handle empty input for free; avoid indexing x[1].",
      expr: `base::identical(clean_site(character(0)), character(0))`,
    },
  ],
};

const TRIAL_SETUP = `
set.seed(42)
trial <- data.frame(
  id = sprintf("P%03d", 1:60),
  arm = rep(c("Placebo", "Treatment"), each = 30),
  visit = rep(c("Baseline", "Week 12"), times = 30),
  outcome = round(rnorm(60, mean = rep(c(10, 13), each = 30), sd = 2), 1)
)
trial$outcome[c(4, 18, 47)] <- NA
`;

/** R helper used by checks: reference summary computed in base R. */
const REFERENCE_SUMMARY = `
.ref <- function(df) {
  w <- df[df$visit == "Week 12" & !is.na(df$outcome), ]
  data.frame(
    arm = sort(unique(w$arm)),
    n = as.vector(tapply(w$outcome, w$arm, length)),
    mean = as.vector(tapply(w$outcome, w$arm, mean)),
    sd = as.vector(tapply(w$outcome, w$arm, sd))
  )
}
.same_summary <- function(got, df) {
  got <- as.data.frame(got)
  if (!all(c("arm", "n", "mean", "sd") %in% names(got))) return(FALSE)
  got <- got[order(as.character(got$arm)), ]
  exp <- .ref(df)
  nrow(got) == nrow(exp) &&
    base::identical(as.character(got$arm), as.character(exp$arm)) &&
    isTRUE(base::all.equal(as.numeric(got$n), as.numeric(exp$n))) &&
    isTRUE(base::all.equal(as.numeric(got$mean), exp$mean, tolerance = 1e-8)) &&
    isTRUE(base::all.equal(as.numeric(got$sd), exp$sd, tolerance = 1e-8))
}
`;

export const summariseArmValidator: ValidatorDefinition = {
  validatorId: "webr:output-match:data-lab.challenge-2",
  challengeId: "data-lab.challenge-2",
  timeoutMs: 30_000,
  setup: TRIAL_SETUP,
  checks: [
    {
      id: "defined",
      description: "summarise_by_arm() is defined as a function",
      hint: "Wrap your pipeline in summarise_by_arm <- function(df) { ... }.",
      expr: `is.function(summarise_by_arm)`,
    },
    {
      id: "columns",
      description: "Returns columns arm, n, mean, and sd — one row per arm",
      hint: "Name the summaries exactly: summarise(n = ..., mean = ..., sd = ...).",
      expr: `local({ r <- as.data.frame(summarise_by_arm(trial)); all(c("arm", "n", "mean", "sd") %in% names(r)) && nrow(r) == 2L })`,
    },
    {
      id: "missing",
      description: "Excludes missing outcomes (no NA in the results)",
      hint: "Use na.rm = TRUE, or filter(!is.na(outcome)) before summarising.",
      expr: `local({ r <- as.data.frame(summarise_by_arm(trial)); !anyNA(r$mean) && !anyNA(r$sd) })`,
    },
    {
      id: "values",
      description: "Correct n, mean, and SD for the Week 12 trial data",
      hint: "n should count non-missing outcomes only — n() counts rows, including NAs.",
      expr: `local({ ${REFERENCE_SUMMARY}; .same_summary(summarise_by_arm(trial), trial) })`,
    },
    {
      id: "unseen",
      description: "Works on an unseen dataset with three arms",
      hint: "Use the df argument everywhere — don't refer to trial inside the function.",
      expr: `local({
        ${REFERENCE_SUMMARY}
        set.seed(7)
        d <- data.frame(
          arm = sample(c("Arm A", "Arm B", "Arm C"), 48, replace = TRUE),
          visit = sample(c("Baseline", "Week 12"), 48, replace = TRUE),
          outcome = round(rnorm(48, 5, 1.5), 2)
        )
        d$outcome[c(2, 9, 31)] <- NA
        .same_summary(summarise_by_arm(d), d)
      })`,
    },
  ],
};

const ENROLLMENT_CSV = [
  "participant_id,site,enrolled,age,arm",
  "1,bos01,2026-01-05,34,Placebo",
  "2, NYC-02,01/12/2026,41,treatment",
  "3,chi03,15 Jan 2026,,TREATMENT",
  "3,chi03,15 Jan 2026,,TREATMENT",
  "4,BOS-01,2026-01-20,NA,placebo",
  "5,nyc02 ,02/03/2026,58,Treatment ",
  "6,SEA-07,3 Feb 2026,29,Placebo",
  "7,sea07,2026-02-10,47,treatment",
  "8,CHI-03,02/14/2026,62,placebo",
];

const HIDDEN_CSV = [
  "participant_id,site,enrolled,age,arm",
  "12,mia12,03/01/2026,50,PLACEBO",
  "10,den04,1 Mar 2026,,Treatment",
  "11,DEN-04,2026-03-02,38,placebo",
  "10,den04,1 Mar 2026,,Treatment",
];

const rVector = (lines: string[]) => `c(${lines.map((l) => JSON.stringify(l)).join(", ")})`;

const LOAD = `r <- as.data.frame(prepare_enrollment("synthetic_enrollment.csv"))`;

export const messyExportValidator: ValidatorDefinition = {
  validatorId: "webr:output-match:data-lab.boss",
  challengeId: "data-lab.boss",
  timeoutMs: 15_000,
  setup: `writeLines(${rVector(ENROLLMENT_CSV)}, "synthetic_enrollment.csv")`,
  checks: [
    {
      id: "defined",
      description: "prepare_enrollment() is defined as a function",
      hint: "Define prepare_enrollment <- function(path) { ... } and return the cleaned data frame.",
      expr: `is.function(prepare_enrollment)`,
    },
    {
      id: "rows",
      description: "One row per participant, sorted by participant_id",
      hint: "unique() removes exact duplicate rows; order() sorts them.",
      expr: `local({ ${LOAD}; base::identical(as.integer(r$participant_id), 1:8) })`,
    },
    {
      id: "types",
      description: "Column types: Date, integer age, factor arm with levels Placebo/Treatment",
      hint: "Use as.Date(), as.integer(), and factor(x, levels = c(\"Placebo\", \"Treatment\")).",
      expr: `local({ ${LOAD}
        all(c("participant_id", "site", "enrolled", "age", "arm") %in% names(r)) &&
          inherits(r$enrolled, "Date") && is.numeric(r$age) && is.factor(r$arm) &&
          base::identical(levels(r$arm), c("Placebo", "Treatment")) })`,
    },
    {
      id: "sites",
      description: "Site codes standardised to AAA-00",
      hint: "Trim, upper-case, and insert the hyphen — the same rule as challenge 1.",
      expr: `local({ ${LOAD}; base::identical(as.character(r$site), c("BOS-01", "NYC-02", "CHI-03", "BOS-01", "NYC-02", "SEA-07", "SEA-07", "CHI-03")) })`,
    },
    {
      id: "dates",
      description: "All three date formats parsed correctly",
      hint: "Parse with %Y-%m-%d first, then fill the remaining NAs using %m/%d/%Y and %d %b %Y.",
      expr: `local({ ${LOAD}; base::identical(as.character(r$enrolled), c("2026-01-05", "2026-01-12", "2026-01-15", "2026-01-20", "2026-02-03", "2026-02-03", "2026-02-10", "2026-02-14")) })`,
    },
    {
      id: "values",
      description: "Ages (with missing values) and arms are correct",
      hint: "Empty strings and \"NA\" should both become NA; normalise arm case and whitespace.",
      expr: `local({ ${LOAD}
        base::identical(as.integer(r$age), c(34L, 41L, NA, NA, 58L, 29L, 47L, 62L)) &&
          base::identical(as.character(r$arm), c("Placebo", "Treatment", "Treatment", "Placebo", "Treatment", "Placebo", "Treatment", "Placebo")) })`,
    },
    {
      id: "unseen",
      description: "Works on a second, unseen export",
      hint: "Use the path argument, and don't assume particular IDs, sites, or row counts.",
      expr: `local({
        f <- tempfile(fileext = ".csv")
        writeLines(${rVector(HIDDEN_CSV)}, f)
        r <- as.data.frame(prepare_enrollment(f))
        base::identical(as.integer(r$participant_id), 10:12) &&
          base::identical(as.character(r$site), c("DEN-04", "DEN-04", "MIA-12")) &&
          base::identical(as.character(r$enrolled), c("2026-03-01", "2026-03-02", "2026-03-01")) &&
          base::identical(as.integer(r$age), c(NA, 38L, 50L)) &&
          base::identical(as.character(r$arm), c("Treatment", "Placebo", "Placebo"))
      })`,
    },
  ],
};
