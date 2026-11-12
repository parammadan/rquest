import type {
  Availability,
  Challenge,
  ChallengeType,
  DifficultyLevel,
  EvaluationSpec,
  Mission,
  MissionId,
} from "../domain/types.ts";
import { dataLabLessons } from "./lessons/data-lab.ts";
import { packageFactoryLessons } from "./lessons/package-factory.ts";
import { debuggingCrisisLessons } from "./lessons/debugging-crisis.ts";
import { qualityControlLessons } from "./lessons/quality-control.ts";
import { researchMissionLessons } from "./lessons/research-mission.ts";

/*
 * Mission catalog — the single source of truth for academy content.
 * Presentation components read from here; they never hard-code content.
 * All datasets referenced in stories are synthetic.
 */

const CHALLENGE_PHASE: Availability = {
  status: "planned",
  phase: 2,
  note: "Will run real R in the browser via WebR once its validator is authored.",
};

interface ChallengeInput {
  slug: string;
  type: ChallengeType;
  title: string;
  summary: string;
  difficulty: DifficultyLevel;
  minutes: number;
  xp: number;
  strategy: EvaluationSpec["strategy"];
  starterCode: string;
  instructions?: string[];
  packages?: string[];
  /** true once a validator exists in content/validators. */
  implemented?: boolean;
  bossBriefing?: Challenge["bossBriefing"];
}

function challenge(missionId: MissionId, input: ChallengeInput): Challenge {
  const id = `${missionId}.${input.slug}`;
  return {
    id,
    kind: "challenge",
    missionId,
    type: input.type,
    title: input.title,
    summary: input.summary,
    difficulty: input.difficulty,
    estimatedMinutes: input.minutes,
    xp: input.xp,
    instructions: input.instructions ?? [input.summary],
    starterCode: input.starterCode.trim(),
    packages: input.packages ?? [],
    ...(input.bossBriefing ? { bossBriefing: input.bossBriefing } : {}),
    evaluation: {
      runtime: "webr",
      strategy: input.strategy,
      validatorId: `webr:${input.strategy}:${id}`,
    },
    availability: input.implemented ? { status: "available" } : CHALLENGE_PHASE,
  };
}

/* ------------------------------------------------------------------ */

const dataLab: Mission = {
  id: "data-lab",
  order: 1,
  worldLabel: "World 1",
  title: "The Data Lab",
  subtitle: "R Fundamentals",
  tagline: "Turn a raw synthetic study export into tidy, trustworthy data.",
  story: [
    "Your first morning at the lab. A collaborator drops a CSV on the shared drive: a synthetic enrollment export with inconsistent site codes, mystery NA values, and dates stored three different ways.",
    "Before anyone can analyse it, someone has to understand it. That someone is you.",
  ],
  objectives: [
    "Work fluently with vectors, types, and missing values",
    "Reshape and filter data frames with dplyr verbs",
    "Encode categorical data correctly with factors",
    "Write small, well-named functions you can reuse",
  ],
  difficulty: 1,
  estimatedHours: 3,
  requires: [],
  rewardAchievementId: "data-explorer",
  theme: { visual: "lab", accent: "cyan" },
  items: [
    dataLabLessons[0],
    dataLabLessons[1],
    challenge("data-lab", {
      slug: "challenge-1",
      type: "code-exercise",
      title: "Clean the site codes",
      summary: "Standardise inconsistent site identifiers and count enrolment per site.",
      difficulty: 1,
      minutes: 15,
      xp: 50,
      strategy: "output-match",
      implemented: true,
      instructions: [
        "Site codes in the export are inconsistent: some are lower-case, some have stray spaces, and some are missing the hyphen.",
        "Write clean_site(x) that trims whitespace, upper-cases, and returns codes in the form AAA-00 (letters, hyphen, digits).",
        "Missing values must stay NA, and the result must be a character vector the same length as x.",
        "A vector called sites is already loaded for you to experiment with. The validator also tests codes you haven't seen.",
      ],
      starterCode: `
# sites is preloaded:
# c("BOS-01", "bos01", "NYC-02", " nyc-02", NA, "CHI-03")

clean_site <- function(x) {
  # TODO: trim whitespace, upper-case, and insert the hyphen
}

clean_site(sites)
`,
    }),
    dataLabLessons[2],
    challenge("data-lab", {
      slug: "challenge-2",
      type: "code-exercise",
      title: "Summarise by treatment arm",
      summary: "Produce n, mean, and SD of a synthetic outcome by arm, handling missing values explicitly.",
      difficulty: 2,
      minutes: 20,
      xp: 60,
      strategy: "output-match",
      implemented: true,
      packages: ["dplyr"],
      instructions: [
        "trial is a synthetic data frame with columns id, arm, visit, and outcome. Some outcomes are missing.",
        "Write summarise_by_arm(df) that keeps only the Week 12 visit and returns one row per arm with columns arm, n, mean, and sd.",
        "n is the number of non-missing outcomes; mean and sd ignore missing values.",
        "The validator runs your function on trial and on a second, unseen dataset — hard-coded numbers will not pass.",
      ],
      starterCode: `
library(dplyr)

summarise_by_arm <- function(df) {
  df |>
    filter(visit == "Week 12") |>
    group_by(arm) |>
    summarise(
      # TODO: n, mean, and sd of outcome
    )
}

summarise_by_arm(trial)
`,
    }),
    challenge("data-lab", {
      slug: "boss",
      type: "boss",
      title: "Boss: The Messy Export",
      summary: "Take the full synthetic export from raw CSV to an analysis-ready tibble with a documented cleaning function.",
      difficulty: 2,
      minutes: 40,
      xp: 150,
      strategy: "output-match",
      implemented: true,
      instructions: [
        "synthetic_enrollment.csv is in your working directory. Inspect it with readLines() first.",
        "Write prepare_enrollment(path) that returns a data frame with one row per participant, sorted by participant_id.",
        "Columns: participant_id (integer), site (AAA-00 codes), enrolled (Date — the file mixes 2026-01-05, 01/12/2026, and 15 Jan 2026), age (integer, NA when missing), and arm (a factor with levels Placebo and Treatment).",
        "The export contains an exact duplicate row. The validator also runs your function on a second, unseen file.",
      ],
      starterCode: `
readLines("synthetic_enrollment.csv")

prepare_enrollment <- function(path) {
  raw <- read.csv(path, colClasses = "character")
  # 1. remove duplicate rows
  # 2. standardise site codes
  # 3. parse the three date formats
  # 4. fix types: integer ids and ages, factor arm
  # 5. one row per participant, sorted by participant_id
}
`,
    }),
  ],
};

const packageFactory: Mission = {
  id: "package-factory",
  order: 2,
  worldLabel: "World 2",
  title: "Package Factory",
  subtitle: "R Package Development",
  tagline: "Ship the lab's helper scripts as a real, documented R package.",
  story: [
    "The lab has fifteen copies of the same helper script, each subtly different. Results disagree depending on whose laptop ran the analysis.",
    "Your mission: consolidate them into one package with documentation, a deliberate NAMESPACE, declared imports, and checks that pass.",
  ],
  objectives: [
    "Lay out a package: DESCRIPTION, NAMESPACE, R/, man/, tests/",
    "Document every function and argument with roxygen2",
    "Control exports and declare imports correctly",
    "Ship a release that passes every package check in the browser, then run R CMD check locally",
  ],
  difficulty: 2,
  estimatedHours: 4,
  requires: ["data-lab"],
  rewardAchievementId: "package-builder",
  theme: { visual: "factory", accent: "violet" },
  assembly: {
    title: "labtools assembly line",
    caption: "Each part is assembled by validated work in this world, never by visiting a page.",
    parts: [
      { id: "root", label: "labtools/", depth: 0, dir: true, note: "the package", assembledBy: [] },
      { id: "description", label: "DESCRIPTION", depth: 1, note: "metadata and Imports", assembledBy: [] },
      { id: "r", label: "R/", depth: 1, dir: true, note: "clean_site(), summarise_arm(), helpers", assembledBy: [] },
      { id: "namespace", label: "NAMESPACE", depth: 1, note: "public interface · Export the right functions", assembledBy: ["package-factory.challenge-1"] },
      { id: "man", label: "man/", depth: 1, dir: true, note: "complete help pages · Silence the check warnings", assembledBy: ["package-factory.challenge-2"] },
      { id: "tests", label: "tests/testthat/", depth: 1, dir: true, note: "tests · Tests, checks, and releases", assembledBy: ["package-factory.lesson-3"] },
      { id: "release", label: "labtools_0.1.0.tar.gz", depth: 0, note: "release · Boss: Ship labtools 0.1.0", assembledBy: ["package-factory.boss"] },
    ],
  },
  items: [
    packageFactoryLessons[0],
    packageFactoryLessons[1],
    challenge("package-factory", {
      slug: "challenge-1",
      type: "package-check",
      title: "Export the right functions",
      summary: "Fix roxygen tags so only the public API is exported and internal helpers stay hidden.",
      difficulty: 2,
      minutes: 20,
      xp: 60,
      strategy: "package-checks",
      implemented: true,
      packages: ["roxygen2", "dplyr"],
      instructions: [
        "You're turning the lab's helper script into the labtools package. The editor holds R/labtools.R; DESCRIPTION already exists.",
        "Export clean_site() so users can call it, and keep the .normalise() helper internal.",
        "Document clean_site() properly: a title, a description for x, and what it returns (@return).",
        "On submit, roxygen2 generates NAMESPACE and man/*.Rd from your comments, and the validator inspects them the way R CMD check would.",
      ],
      starterCode: String.raw`
#' Standardise site codes
#'
#' @param x
clean_site <- function(x) {
  .normalise(x)
}

# Internal helper: must NOT be exported
#' @export
.normalise <- function(x) {
  x <- toupper(trimws(x))
  sub("^([A-Z]+)-?([0-9]+)$", "\\1-\\2", x)
}
`,
    }),
    packageFactoryLessons[2],
    challenge("package-factory", {
      slug: "challenge-2",
      type: "package-check",
      title: "Silence the check warnings",
      summary: "Fix the undocumented argument and undeclared imports that R CMD check reports.",
      difficulty: 3,
      minutes: 25,
      xp: 70,
      strategy: "package-checks",
      implemented: true,
      packages: ["roxygen2", "dplyr"],
      instructions: [
        "R CMD check on labtools reports: undocumented argument 'na_rm' in summarise_arm(), and no visible global function definition for 'group_by', 'summarise', and 'sd'.",
        "Fix both without changing behaviour. Document na_rm, then either import the functions (@importFrom dplyr …, @importFrom stats sd) or call them as dplyr::group_by() and so on.",
        "DESCRIPTION already lists dplyr under Imports. stats ships with R, but its functions still have to be imported.",
        "A data frame called lab is preloaded for experimenting. (Real R CMD check would also note the bare column names arm and outcome; that's covered in a later lesson.)",
      ],
      starterCode: String.raw`
#' Mean outcome by treatment arm
#'
#' @param df A data frame with columns arm and outcome.
#' @return A data frame with one row per arm and columns arm, mean, and sd.
#' @export
summarise_arm <- function(df, na_rm = TRUE) {
  grouped <- group_by(df, arm)
  summarise(grouped, mean = mean(outcome, na.rm = na_rm), sd = sd(outcome, na.rm = na_rm))
}

# Try it with Run:  summarise_arm(lab)
# (Package files shouldn't contain top-level calls; roxygen2 runs them while building.)
`,
    }),
    challenge("package-factory", {
      slug: "boss",
      type: "boss",
      title: "Boss: Ship labtools 0.1.0",
      summary: "Assemble the package end-to-end and pass every package check: exports, docs, examples, and imports.",
      difficulty: 3,
      minutes: 50,
      xp: 200,
      strategy: "package-checks",
      implemented: true,
      packages: ["roxygen2", "dplyr"],
      bossBriefing: {
        headline: "Release day: labtools 0.1.0",
        story: "The analysis team installs labtools tomorrow. Ship it only when every release gate is green.",
        gates: [
          "roxygen2 builds NAMESPACE and man/",
          "Exactly two exports",
          "Complete docs with runnable examples",
          "No undefined global functions",
          "Correct on unseen inputs",
        ],
      },
      instructions: [
        "Write the whole of R/labtools.R for release 0.1.0.",
        "Export exactly two functions: clean_site(x), which standardises site codes and keeps NA, and summarise_arm(df, na_rm = TRUE), which returns one row per arm with columns arm, mean, and sd.",
        "Each export needs a title, @param for every argument, @return, and an @examples section that runs on its own.",
        "No undefined global functions anywhere: import or pkg::-qualify everything that isn't base R. Internal helpers are fine as long as they aren't exported.",
        "The validator builds the package with roxygen2, runs your examples, and tests both functions on inputs you haven't seen.",
      ],
      starterCode: String.raw`
# R/labtools.R — the entire package source for labtools 0.1.0

#' Standardise site codes
#'
#' @param x Character vector of raw site codes.
#' @return
#' @export
clean_site <- function(x) {
  # TODO
}

# TODO: summarise_arm(df, na_rm = TRUE)
#   - one row per arm with columns arm, mean, sd
#   - document it, give it runnable @examples, declare its imports
`,
    }),
  ],
};

const debuggingCrisis: Mission = {
  id: "debugging-crisis",
  order: 3,
  worldLabel: "World 3",
  title: "Debugging Crisis",
  subtitle: "R Environment Debugging",
  tagline: "The pipeline worked yesterday. Today it doesn't. Find out why.",
  story: [
    "A scheduled report fails overnight. The error message points at a function nobody changed. A colleague's machine produces different numbers from the same script.",
    "You'll trace masked functions, scoping bugs, and session-dependent behaviour until the report gives the same answer anywhere.",
  ],
  objectives: [
    "Diagnose masked functions and namespace conflicts",
    "Find functions that read global variables, and make them pure",
    "Remove dependence on the working directory, options, and attached packages",
    "Record provenance: R version, package versions, input checksums",
  ],
  difficulty: 3,
  estimatedHours: 4,
  requires: ["package-factory"],
  rewardAchievementId: "bug-hunter",
  theme: { visual: "crisis", accent: "coral" },
  items: [
    debuggingCrisisLessons[0],
    challenge("debugging-crisis", {
      slug: "challenge-1",
      type: "debugging",
      title: "The masked select",
      summary: "A pipeline breaks because MASS::select() masks dplyr::select(). Make it immune to attach order.",
      difficulty: 3,
      minutes: 20,
      xp: 70,
      strategy: "output-match",
      implemented: true,
      packages: ["dplyr", "MASS"],
      instructions: [
        "outcome_table(df) should return the arm and outcome columns, dropping rows with a missing outcome.",
        "It worked yesterday. Today another script in the pipeline attaches MASS after dplyr, and the call fails with \"unused argument\".",
        "Run it to see the error, find out which select() is being called (environment(select), conflicts()), and fix the function so it works whatever is attached, even when dplyr isn't attached at all.",
        "trial (synthetic) is preloaded, with dplyr and MASS attached in the order that breaks things.",
      ],
      starterCode: String.raw`
library(dplyr)
library(MASS)   # attached later by another script in the pipeline

outcome_table <- function(df) {
  df |>
    select(arm, outcome) |>
    filter(!is.na(outcome))
}

outcome_table(trial)
`,
    }),
    debuggingCrisisLessons[1],
    debuggingCrisisLessons[2],
    challenge("debugging-crisis", {
      slug: "challenge-2",
      type: "debugging",
      title: "Lexical scoping surprise",
      summary: "A helper reads a global variable instead of its argument. Make it pure.",
      difficulty: 3,
      minutes: 20,
      xp: 70,
      strategy: "output-match",
      implemented: true,
      packages: [],
      instructions: [
        "flag_signals() is supposed to flag p-values below alpha, but its results change whenever someone edits a global variable.",
        "Fix it so it depends only on its arguments, with alpha defaulting to 0.05. Missing p-values should stay NA.",
        "The validator changes the global threshold behind your back and inspects which variables the function reads.",
      ],
      starterCode: String.raw`
threshold <- 0.05

flag_signals <- function(p_values, alpha) {
  p_values < threshold   # bug: ignores alpha
}

flag_signals(c(0.01, 0.04, 0.2), alpha = 0.025)
`,
    }),
    challenge("debugging-crisis", {
      slug: "boss",
      type: "boss",
      title: "Boss: Works On My Machine",
      summary: "Make a fragile report produce identical results in any session — then record exactly what it ran on.",
      difficulty: 4,
      minutes: 55,
      xp: 220,
      strategy: "reproducibility-diff",
      implemented: true,
      packages: ["dplyr", "MASS"],
      instructions: [
        "report.R runs fine on its author's laptop and fails in the overnight job. Make run_report(data_dir) produce the same result in any session.",
        "It must read file.path(data_dir, \"visits.csv\") and return list(table, session). table has one row per arm (alphabetical) with n (non-missing outcomes), mean, sd, and label = sprintf(\"%.2f (%.2f)\", mean, sd).",
        "session records provenance: r_version (R.version.string), packages = c(dplyr = <installed version>), and input_md5 (tools::md5sum of the input).",
        "The validator re-runs your function from another working directory, under different options(OutDec, digits), and with dplyr detached, and checks that it leaves the caller's options and working directory alone. The data is in data/visits.csv.",
      ],
      starterCode: String.raw`
# report.R — works on the author's laptop, fails in the overnight job.
library(dplyr)

run_report <- function(data_dir) {
  d <- read.csv("visits.csv")              # relies on the working directory
  tab <- d |>
    filter(!is.na(outcome)) |>
    group_by(arm) |>
    summarise(n = n(), mean = mean(outcome), sd = sd(outcome))
  tab$label <- paste0(format(round(tab$mean, 2), nsmall = 2), " (",
                      format(round(tab$sd, 2), nsmall = 2), ")")
  list(table = as.data.frame(tab), session = NULL)   # TODO: provenance
}
`,
    }),
  ],
};

const qualityControl: Mission = {
  id: "quality-control",
  order: 4,
  worldLabel: "World 4",
  title: "Quality Control",
  subtitle: "Testing and Validation",
  tagline: "Prove your code is right before anyone has to trust it.",
  story: [
    "A summary table is going into a report. The rule is simple: nothing ships without independent verification.",
    "You'll write testthat suites, cover edge cases, validate inputs, and perform independent double-programming QC against a second implementation.",
  ],
  objectives: [
    "Write unit tests with testthat expectations",
    "Cover edge cases: empty data, NA, single-row groups",
    "Validate inputs and fail with informative errors",
    "Perform independent double-programming QC",
  ],
  difficulty: 4,
  estimatedHours: 5,
  requires: ["debugging-crisis"],
  rewardAchievementId: "test-guardian",
  theme: { visual: "qc", accent: "emerald" },
  items: [
    qualityControlLessons[0],
    challenge("quality-control", {
      slug: "challenge-1",
      type: "test-writing",
      title: "Guard the edge cases",
      summary: "Write testthat tests strong enough to catch four subtly broken versions of a function.",
      difficulty: 3,
      minutes: 25,
      xp: 70,
      strategy: "mutation-testing",
      implemented: true,
      packages: ["testthat"],
      instructions: [
        "summarise_arm(df) is preloaded. It returns one row per arm with n (non-missing outcomes), mean and sd (ignoring NA), and it errors on empty input.",
        "Write testthat tests for it. The validator runs your tests against the real function, where they must all pass with at least 3 expectations, and against four mutants (subtly broken copies), each of which must make at least one test fail.",
        "Think about missing values, empty input, and arms with a single observation. Run prints each test's result as you go.",
      ],
      starterCode: String.raw`
test_that("summarise_arm handles missing outcomes", {
  df <- data.frame(arm = c("A", "A", "B"), outcome = c(1, NA, 3))
  result <- summarise_arm(df)
  # TODO: expectations
})

test_that("summarise_arm rejects empty input", {
  # TODO
})
`,
    }),
    qualityControlLessons[1],
    qualityControlLessons[2],
    challenge("quality-control", {
      slug: "challenge-2",
      type: "code-exercise",
      title: "Fail loudly, fail clearly",
      summary: "Validate inputs at the boundary with classed, informative errors.",
      difficulty: 3,
      minutes: 25,
      xp: 80,
      strategy: "testthat-suite",
      implemented: true,
      packages: ["rlang", "testthat"],
      instructions: [
        "validate_trial(df) guards every analysis function. Bad input should stop with an error a colleague can act on.",
        "Raise errors with rlang::abort(message, class = \"rquest_invalid_input\") for: input that isn't a data frame; missing columns among id, arm, outcome (name them); a non-numeric outcome (say \"numeric\"); duplicate ids (name them); and zero rows (say \"no rows\").",
        "Valid data passes silently and is returned invisibly, unchanged. trial_ok is preloaded. A hidden testthat suite checks each case with expect_error(class = , regexp = ).",
      ],
      starterCode: String.raw`
validate_trial <- function(df) {
  stopifnot(is.data.frame(df))
  # TODO: required columns id, arm, outcome — name any that are missing
  # TODO: outcome must be numeric
  # TODO: ids must be unique — name the duplicates
  # TODO: at least one row
  invisible(df)
}

validate_trial(trial_ok)
`,
    }),
    challenge("quality-control", {
      slug: "boss",
      type: "boss",
      title: "Boss: Independent QC",
      summary: "Double-program a synthetic demographics table and report every discrepancy with the production output.",
      difficulty: 4,
      minutes: 60,
      xp: 240,
      strategy: "output-match",
      implemented: true,
      packages: [],
      instructions: [
        "Nothing ships without independent QC. adsl (synthetic subject-level data: USUBJID, ARM, AGE, SEX) and prod (the production team's table) are preloaded.",
        "Write qc_demographics(adsl), your own independent version of the table: one row per arm with arm, n, age_mean, age_sd, and pct_female (0–100).",
        "Write compare_tables(prod, qc, tolerance = 1e-8), which returns a data frame with columns arm, column, prod, and qc, with one row for every numeric cell that differs by more than tolerance (zero rows if none).",
        "Production has a bug. Your comparison must find it and nothing else. Both functions are also tested on unseen data.",
      ],
      starterCode: String.raw`
# adsl and prod are preloaded. Program the table independently: don't reverse-engineer prod.
qc_demographics <- function(adsl) {
  # one row per ARM: arm, n, age_mean, age_sd, pct_female (0-100)
}

compare_tables <- function(prod, qc, tolerance = 1e-8) {
  # data frame: arm, column, prod, qc (one row per mismatching cell)
}
`,
    }),
  ],
};

const researchMission: Mission = {
  id: "research-mission",
  order: 5,
  worldLabel: "World 5",
  title: "Research Mission",
  subtitle: "Reproducible Statistical Programming",
  tagline: "Deliver an analysis anyone can re-run and get the same answer.",
  story: [
    "The final mission. A synthetic trial dataset, a statistical analysis plan, and a reviewer who will re-run everything from scratch.",
    "Build an analysis with seeded randomness, computed reporting, and byte-identical outputs, then hand it over.",
  ],
  objectives: [
    "Control randomness with explicit seeds and RNG kinds",
    "Leave the caller's random-number stream untouched",
    "Generate report text where every number is computed",
    "Produce outputs a reviewer re-creates byte-for-byte",
  ],
  difficulty: 5,
  estimatedHours: 6,
  requires: ["quality-control"],
  rewardAchievementId: "research-champion",
  theme: { visual: "research", accent: "gold" },
  items: [
    researchMissionLessons[0],
    researchMissionLessons[1],
    challenge("research-mission", {
      slug: "challenge-1",
      type: "code-exercise",
      title: "Reproducible bootstrap",
      summary: "Make a bootstrap confidence interval bit-for-bit reproducible, whatever the caller's RNG settings.",
      difficulty: 4,
      minutes: 25,
      xp: 80,
      strategy: "reproducibility-diff",
      implemented: true,
      packages: ["withr"],
      instructions: [
        "boot_ci(x, B = 2000, seed = 1) should return c(lower = , upper = ), a 95% percentile bootstrap CI of the mean.",
        "Specification: set.seed(seed, kind = \"Mersenne-Twister\", normal.kind = \"Inversion\", sample.kind = \"Rejection\"); drop NAs; means <- replicate(B, mean(sample(x, replace = TRUE))); take the 2.5% and 97.5% quantiles.",
        "Same seed, same answer, even if the caller has changed RNGkind() (R 3.6 changed the default sample.kind, a classic source of irreproducible results).",
        "And leave the caller's random-number stream exactly as it was: restore it with on.exit(), or use withr::with_seed(). x_obs is preloaded.",
      ],
      starterCode: String.raw`
boot_ci <- function(x, B = 2000, seed = 1) {
  means <- replicate(B, mean(sample(x, replace = TRUE)))
  c(lower = unname(quantile(means, 0.025)), upper = unname(quantile(means, 0.975)))
}

# TODO: make boot_ci() reproducible:
#   - same seed -> identical result, whatever RNGkind() the caller uses
#   - leave the caller's random-number stream exactly as it was

boot_ci(x_obs)
`,
    }),
    researchMissionLessons[2],
    challenge("research-mission", {
      slug: "challenge-2",
      type: "code-exercise",
      title: "Trace the numbers",
      summary: "Generate a report sentence from data so every number is computed, never pasted.",
      difficulty: 4,
      minutes: 25,
      xp: 80,
      strategy: "output-match",
      implemented: true,
      packages: [],
      instructions: [
        "In a Quarto report this function is called from inline code, `r week12_sentence(week12)`, so the text can never drift from the data.",
        "week12_sentence(df) takes columns arm and change (Week 12 change from baseline; some NA) and returns one string: for each arm in alphabetical order, \"<arm>: mean change <m> (95% CI <lo> to <hi>; n = <n>).\", joined with single spaces.",
        "Use a t-interval, mean ± qt(0.975, n − 1) × sd / √n, on non-missing values, with 2 decimals via sprintf(). week12 is preloaded, and the validator also uses an unseen three-arm dataset.",
      ],
      starterCode: String.raw`
# Called from inline R code in report.qmd, so the sentence is always computed from the data.
week12_sentence <- function(df) {
  "Treatment: mean change 4.2 (95% CI 3.1 to 5.3; n = 28)."   # hard-coded: compute it instead
}

week12_sentence(week12)
`,
    }),
    challenge("research-mission", {
      slug: "boss",
      type: "boss",
      title: "Boss: The Reviewer Re-run",
      summary: "Deliver an analysis whose output files a reviewer re-creates byte-for-byte from a clean session.",
      difficulty: 5,
      minutes: 75,
      xp: 300,
      strategy: "reproducibility-diff",
      implemented: true,
      packages: ["withr"],
      instructions: [
        "run_analysis(raw_path, out_dir, seed = 20261112) is the whole analysis. A reviewer will re-run it from another directory, with different options and RNG settings, and compare every output file byte-for-byte.",
        "Analysis set: rows with non-missing week12; change = week12 − baseline. Primary model: lm(change ~ arm + baseline). Report the armTreatment row as results with term, estimate, std_error, ci_low, ci_high (95%, confint), p_value, and n.",
        "Audit sample: 5 participants for source-data verification, sort(sample(analysis$participant, 5)) with the RNG pinned as in the bootstrap challenge, without disturbing the caller's RNG.",
        "Write results.csv, audit_sample.csv (column participant), and provenance.txt (R version, seed, input MD5) into out_dir, creating it if needed. Return list(results, audit). raw_path points to a synthetic trial export.",
      ],
      starterCode: String.raw`
# The reviewer re-runs this from a clean session and diffs every output file.
run_analysis <- function(raw_path, out_dir, seed = 20261112) {
  raw <- read.csv(raw_path)
  analysis <- raw[!is.na(raw$week12), ]
  analysis$change <- analysis$week12 - analysis$baseline
  fit <- lm(change ~ arm + baseline, data = analysis)
  audit <- sample(analysis$participant, 5)   # TODO: reproducible, and leave the caller's RNG alone
  # TODO: results (term, estimate, std_error, ci_low, ci_high, p_value, n)
  # TODO: write results.csv, audit_sample.csv, provenance.txt into out_dir
}
`,
    }),
  ],
};

/**
 * Each lesson sits directly before the challenge it prepares for:
 * lesson 1 → challenge 1 → lesson 2 → challenge 2 → lesson 3 → boss.
 */
function withLessonOrder(mission: Mission): Mission {
  const lessons = mission.items.filter((i) => i.kind === "lesson");
  const ordered = lessons.flatMap((l) => {
    const challenge = mission.items.find((i) => i.id === l.challengeId);
    if (!challenge) throw new Error(`${l.id} links to missing challenge ${l.challengeId}`);
    return [l, challenge];
  });
  if (ordered.length !== mission.items.length) throw new Error(`${mission.id}: every challenge needs exactly one lesson`);
  return { ...mission, items: ordered };
}

export const MISSIONS: readonly Mission[] = [
  dataLab,
  packageFactory,
  debuggingCrisis,
  qualityControl,
  researchMission,
].map(withLessonOrder);
