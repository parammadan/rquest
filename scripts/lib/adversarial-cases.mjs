// Adversarial grader cases, shared by the webR self-test (CI) and documented in
// docs/MILESTONE_4A_INTEGRITY_AND_EVIDENCE.md. Each case: learner code, setup, checks,
// and the verdict string the grader must produce ("PASS PASS", "FAIL", "TAMPER", ...).
export const GENERIC_CASES = [
  { name: "honest wrong answer fails", code: "x <- 1", setup: "", checks: ["identical(x, 2)", "x == 2"], expect: "FAIL FAIL" },
  {
    name: "global isTRUE override does not pass a wrong answer",
    code: 'assign("isTRUE", function(x) TRUE, envir = globalenv()); x <- 1',
    setup: "",
    checks: ["identical(x, 2)", "x == 2"],
    expect: "FAIL FAIL",
  },
  { name: "shadowing identical in learner code", code: "identical <- function(...) TRUE; x <- 1", setup: "", checks: ["identical(x, 2)"], expect: "FAIL" },
  {
    name: "redefining common base functions",
    code: "length <- function(x) 2L; all.equal <- function(...) TRUE; `%in%` <- function(a, b) TRUE; is.na <- function(x) FALSE; x <- c(1, NA)",
    setup: "",
    checks: ["length(x) == 2L && !anyNA(x)", "isTRUE(all.equal(x, c(9, 9)))", "'z' %in% c('a')"],
    expect: "FAIL FAIL FAIL",
  },
  {
    name: "rebinding a validator helper",
    code: ".ref <- function(x) TRUE; x <- 1",
    setup: ".ref <- function(x) identical(x, 2)",
    checks: [".ref(x)"],
    expect: "FAIL",
  },
  {
    name: "pre-filling a setup cache",
    code: ".cache$result <- TRUE; x <- 1",
    setup: ".cache <- new.env(); .get <- function() { if (!is.null(.cache$result)) return(.cache$result); .cache$result <- identical(x, 2); .cache$result }",
    checks: [".get()"],
    expect: "FAIL",
  },
  {
    name: "replacing the old global grader name",
    code: 'try(rm(".rquest", envir = globalenv()), silent = TRUE); .rquest <- list(validate = function(...) "PASS"); x <- 1',
    setup: "",
    checks: ["identical(x, 2)"],
    expect: "FAIL",
  },
  { name: "printed PASS output is ignored", code: 'cat("PASS\\nPASS\\n"); print(TRUE); x <- 1', setup: "", checks: ["identical(x, 2)"], expect: "FAIL" },
  {
    name: "unlockBinding + assign on base isTRUE is refused",
    code: 'unlockBinding("isTRUE", baseenv()); assign("isTRUE", function(x) TRUE, envir = baseenv()); x <- 1',
    setup: "",
    checks: ["identical(x, 2)"],
    expect: "TAMPER",
    tamper: true,
  },
  {
    name: "a learner function that tampers during a check is refused",
    code: 'f <- function() { unlockBinding("identical", baseenv()); assign("identical", function(...) TRUE, envir = baseenv()); 1 }',
    setup: "",
    checks: ["identical(f(), 2)"],
    expect: "TAMPER",
    tamper: true,
  },
  {
    name: "correct code still passes despite global shadowing",
    code: 'assign("identical", function(...) FALSE, envir = globalenv()); f <- function(x) x * 2',
    setup: "",
    checks: ["identical(f(2), 4)", "is.function(f)"],
    expect: "PASS PASS",
  },
  { name: "learner functions can use setup data", code: "f <- function() sum(d)", setup: "d <- 1:3", checks: ["identical(f(), 6L)"], expect: "PASS" },
  { name: "syntax errors are classified", code: "f <- function( {", setup: "", checks: ["TRUE"], expect: "SYNTAX" },
  { name: "runtime errors are classified", code: "stop('boom')", setup: "", checks: ["TRUE"], expect: "ERROR" },
];

// Prepended to each challenge's starter code: the documented bypasses plus attempts to
// pre-fill validator state. Starter code must still fail every validator with it.
export const BYPASS_KIT = String.raw`
assign("isTRUE", function(x) TRUE, envir = globalenv())
assign("identical", function(...) TRUE, envir = globalenv())
identical <- function(...) TRUE
all.equal <- function(...) TRUE
isTRUE <- function(x) TRUE
setequal <- function(...) TRUE
.caught <- function(...) TRUE
.all_pass <- function(...) TRUE
.same_table <- function(...) TRUE
.same_results <- function(...) TRUE
.near <- function(...) TRUE
.fails <- function(...) TRUE
.documented <- function(...) TRUE
.examples_run <- function(...) TRUE
if (exists(".pkg_state", inherits = FALSE)) .pkg_state$result <- list(ok = TRUE, ns = list(exports = c("clean_site", "summarise_arm"), exportPatterns = character()))
`;
