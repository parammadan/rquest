/**
 * R code installed once per session. `.rquest$validate` evaluates the
 * learner's code in a fresh environment (with the challenge setup loaded into
 * a fresh working directory), then evaluates each check in a child of that
 * environment. It returns only "PASS"/"FAIL" per check, or c("ERROR", msg) —
 * printed output cannot influence the verdict.
 */
export const R_HARNESS = String.raw`
.rquest <- new.env()

.rquest$prepare <- function(setup) {
  d <- tempfile("rquest-")
  dir.create(d)
  setwd(d)
  env <- new.env(parent = globalenv())
  eval(parse(text = setup, keep.source = FALSE), envir = env)
  env
}

.rquest$validate <- function(code, setup, checks) {
  env <- .rquest$prepare(setup)
  parsed <- tryCatch(parse(text = code, keep.source = FALSE), error = function(e) e)
  if (inherits(parsed, "error")) {
    return(c("ERROR", paste0("Your code has a syntax error: ", conditionMessage(parsed))))
  }
  err <- tryCatch({
    suppressWarnings(suppressMessages(utils::capture.output(
      for (ex in parsed) eval(ex, envir = env)
    )))
    NULL
  }, error = function(e) conditionMessage(e))
  if (!is.null(err)) {
    return(c("ERROR", paste0("Your code stopped with an error: ", err)))
  }
  vapply(checks, function(check) {
    ok <- tryCatch({
      res <- FALSE
      utils::capture.output(suppressWarnings(suppressMessages(
        res <- isTRUE(eval(parse(text = check, keep.source = FALSE), envir = new.env(parent = env)))
      )))
      res
    }, error = function(e) FALSE)
    if (isTRUE(ok)) "PASS" else "FAIL"
  }, character(1), USE.NAMES = FALSE)
}

# Learner code cannot redefine the harness for later validations.
lockEnvironment(.rquest, bindings = TRUE)
lockBinding(".rquest", globalenv())
`;
