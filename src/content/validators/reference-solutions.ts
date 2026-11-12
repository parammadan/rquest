/**
 * Reference solutions for World 1. Imported only by tests (unit + e2e),
 * never by application code, so they are not shipped to learners.
 */
export const REFERENCE_SOLUTIONS: Record<string, string> = {
  "data-lab.challenge-1": `clean_site <- function(x) {
  x <- toupper(trimws(x))
  sub("^([A-Z]+)-?([0-9]+)$", "\\\\1-\\\\2", x)
}`,
  "data-lab.challenge-2": `library(dplyr)
summarise_by_arm <- function(df) {
  df |>
    filter(visit == "Week 12", !is.na(outcome)) |>
    group_by(arm) |>
    summarise(n = n(), mean = mean(outcome), sd = sd(outcome))
}`,
  "data-lab.boss": `prepare_enrollment <- function(path) {
  raw <- read.csv(path, colClasses = "character", strip.white = TRUE, na.strings = c("", "NA"))
  raw <- unique(raw)
  d <- raw$enrolled
  date <- as.Date(d, format = "%Y-%m-%d")
  date[is.na(date)] <- as.Date(d[is.na(date)], format = "%m/%d/%Y")
  date[is.na(date)] <- as.Date(d[is.na(date)], format = "%d %b %Y")
  out <- data.frame(
    participant_id = as.integer(raw$participant_id),
    site = sub("^([A-Z]+)-?([0-9]+)$", "\\\\1-\\\\2", toupper(trimws(raw$site))),
    enrolled = date,
    age = as.integer(raw$age),
    arm = factor(tools::toTitleCase(tolower(trimws(raw$arm))), levels = c("Placebo", "Treatment"))
  )
  out[order(out$participant_id), , drop = FALSE]
}`,
  "package-factory.challenge-1": String.raw`#' Standardise site codes
#'
#' @param x Character vector of raw site codes.
#' @return Character vector of codes in the form AAA-00, NA preserved.
#' @export
clean_site <- function(x) {
  .normalise(x)
}

# Internal helper: not exported
.normalise <- function(x) {
  x <- toupper(trimws(x))
  sub("^([A-Z]+)-?([0-9]+)$", "\\1-\\2", x)
}`,
  "package-factory.challenge-2": String.raw`#' Mean outcome by treatment arm
#'
#' @param df A data frame with columns arm and outcome.
#' @param na_rm Drop missing outcomes before summarising?
#' @return A data frame with one row per arm and columns arm, mean, and sd.
#' @importFrom dplyr group_by summarise
#' @importFrom stats sd
#' @export
summarise_arm <- function(df, na_rm = TRUE) {
  grouped <- group_by(df, arm)
  summarise(grouped, mean = mean(outcome, na.rm = na_rm), sd = sd(outcome, na.rm = na_rm))
}`,
  "package-factory.boss": String.raw`#' Standardise site codes
#'
#' @param x Character vector of raw site codes.
#' @return Character vector of codes in the form AAA-00, NA preserved.
#' @examples
#' clean_site(c(" bos01", "NYC-02", NA))
#' @export
clean_site <- function(x) {
  x <- toupper(trimws(x))
  sub("^([A-Z]+)-?([0-9]+)$", "\\1-\\2", x)
}

#' Mean and SD of outcome by arm
#'
#' @param df A data frame with columns arm and outcome.
#' @param na_rm Drop missing outcomes before summarising?
#' @return A data frame with one row per arm and columns arm, mean, and sd.
#' @examples
#' summarise_arm(data.frame(arm = c("A", "A", "B"), outcome = c(1, 2, 4)))
#' @importFrom dplyr group_by summarise
#' @importFrom stats sd
#' @export
summarise_arm <- function(df, na_rm = TRUE) {
  grouped <- group_by(df, arm)
  summarise(grouped, mean = mean(outcome, na.rm = na_rm), sd = sd(outcome, na.rm = na_rm))
}`,
  "debugging-crisis.challenge-1": String.raw`outcome_table <- function(df) {
  df |>
    dplyr::select(arm, outcome) |>
    dplyr::filter(!is.na(outcome))
}`,
  "debugging-crisis.challenge-2": String.raw`flag_signals <- function(p_values, alpha = 0.05) {
  p_values < alpha
}`,
  "debugging-crisis.boss": String.raw`run_report <- function(data_dir) {
  path <- file.path(data_dir, "visits.csv")
  d <- utils::read.csv(path, stringsAsFactors = FALSE)
  d <- d[!is.na(d$outcome), ]
  arms <- sort(unique(d$arm))
  per_arm <- function(f) vapply(arms, function(a) f(d$outcome[d$arm == a]), numeric(1), USE.NAMES = FALSE)
  tab <- data.frame(arm = arms, n = as.integer(per_arm(length)), mean = per_arm(mean), sd = per_arm(stats::sd))
  tab$label <- sprintf("%.2f (%.2f)", tab$mean, tab$sd)
  list(
    table = tab,
    session = list(
      r_version = R.version.string,
      packages = c(dplyr = as.character(utils::packageVersion("dplyr"))),
      input_md5 = unname(tools::md5sum(path))
    )
  )
}`,
  "quality-control.challenge-1": String.raw`test_that("n counts non-missing outcomes and the mean ignores NA", {
  df <- data.frame(arm = c("A", "A", "B"), outcome = c(1, NA, 3))
  r <- summarise_arm(df)
  expect_equal(r$n[r$arm == "A"], 1)
  expect_equal(r$mean[r$arm == "A"], 1)
})

test_that("empty input is an error", {
  expect_error(summarise_arm(data.frame(arm = character(), outcome = numeric())))
})

test_that("arms with a single observation are kept", {
  df <- data.frame(arm = c("A", "B", "B"), outcome = c(5, 1, 3))
  expect_equal(sort(summarise_arm(df)$arm), c("A", "B"))
})`,
  "quality-control.challenge-2": String.raw`validate_trial <- function(df) {
  fail <- function(...) rlang::abort(paste0(...), class = "rquest_invalid_input")
  if (!is.data.frame(df)) fail("df must be a data frame, not ", class(df)[1], ".")
  missing_cols <- setdiff(c("id", "arm", "outcome"), names(df))
  if (length(missing_cols)) fail("Missing required column(s): ", paste(missing_cols, collapse = ", "), ".")
  if (!is.numeric(df$outcome)) fail("outcome must be numeric, not ", class(df$outcome)[1], ".")
  dups <- unique(df$id[duplicated(df$id)])
  if (length(dups)) fail("Duplicate id(s): ", paste(dups, collapse = ", "), ".")
  if (nrow(df) == 0) fail("df has no rows.")
  invisible(df)
}`,
  "quality-control.boss": String.raw`qc_demographics <- function(adsl) {
  arms <- sort(unique(adsl$ARM))
  rows <- lapply(arms, function(a) {
    d <- adsl[adsl$ARM == a, ]
    data.frame(arm = a, n = nrow(d), age_mean = mean(d$AGE), age_sd = sd(d$AGE),
               pct_female = 100 * sum(d$SEX == "F") / nrow(d))
  })
  do.call(rbind, rows)
}

compare_tables <- function(prod, qc, tolerance = 1e-8) {
  cols <- setdiff(intersect(names(prod), names(qc)), "arm")
  out <- data.frame(arm = character(), column = character(), prod = numeric(), qc = numeric())
  for (a in intersect(prod$arm, qc$arm)) {
    for (cl in cols) {
      p <- prod[[cl]][prod$arm == a]
      q <- qc[[cl]][qc$arm == a]
      if (abs(p - q) > tolerance) out <- rbind(out, data.frame(arm = a, column = cl, prod = p, qc = q))
    }
  }
  out
}`,
  "research-mission.challenge-1": String.raw`boot_ci <- function(x, B = 2000, seed = 1) {
  x <- x[!is.na(x)]
  means <- withr::with_seed(
    seed,
    replicate(B, mean(sample(x, replace = TRUE))),
    .rng_kind = "Mersenne-Twister", .rng_normal_kind = "Inversion", .rng_sample_kind = "Rejection"
  )
  c(lower = quantile(means, 0.025, names = FALSE), upper = quantile(means, 0.975, names = FALSE))
}`,
  "research-mission.challenge-2": String.raw`week12_sentence <- function(df) {
  arms <- sort(unique(df$arm))
  parts <- vapply(arms, function(a) {
    x <- df$change[df$arm == a & !is.na(df$change)]
    n <- length(x)
    m <- mean(x)
    h <- qt(0.975, n - 1) * sd(x) / sqrt(n)
    sprintf("%s: mean change %.2f (95%% CI %.2f to %.2f; n = %d).", a, m, m - h, m + h, n)
  }, character(1))
  paste(parts, collapse = " ")
}`,
  "research-mission.boss": String.raw`run_analysis <- function(raw_path, out_dir, seed = 20261112) {
  raw <- utils::read.csv(raw_path, stringsAsFactors = FALSE)
  analysis <- raw[!is.na(raw$week12), ]
  analysis$change <- analysis$week12 - analysis$baseline
  analysis$arm <- factor(analysis$arm, levels = c("Placebo", "Treatment"))
  fit <- stats::lm(change ~ arm + baseline, data = analysis)
  co <- summary(fit)$coefficients["armTreatment", ]
  ci <- stats::confint(fit)["armTreatment", ]
  results <- data.frame(term = "armTreatment", estimate = co[[1]], std_error = co[[2]],
                        ci_low = ci[[1]], ci_high = ci[[2]], p_value = co[[4]], n = nrow(analysis))
  audit <- withr::with_seed(seed, sort(sample(analysis$participant, 5)),
    .rng_kind = "Mersenne-Twister", .rng_normal_kind = "Inversion", .rng_sample_kind = "Rejection")
  dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)
  utils::write.csv(results, file.path(out_dir, "results.csv"), row.names = FALSE)
  utils::write.csv(data.frame(participant = audit), file.path(out_dir, "audit_sample.csv"), row.names = FALSE)
  writeLines(c(paste0("R: ", R.version.string), paste0("seed: ", seed),
               paste0("input_md5: ", unname(tools::md5sum(raw_path)))),
             file.path(out_dir, "provenance.txt"))
  list(results = results, audit = audit)
}`,
};
