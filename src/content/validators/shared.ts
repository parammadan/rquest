/**
 * R helpers shared by several validators. Evaluated as part of challenge
 * setup, inside the learner's environment (so `.learner_env` is that env).
 */
export const SESSION_HELPERS = String.raw`
.learner_env <- environment()

# Run f() with hostile session options; restore afterwards.
.with_hostile_options <- function(f) {
  old <- options(OutDec = ",", digits = 3)
  on.exit(options(old))
  f()
}

# Run f() with a non-default RNG configuration; restore afterwards.
.with_hostile_rng <- function(f) {
  old <- RNGkind()
  on.exit(suppressWarnings(RNGkind(old[1], old[2], old[3])))
  suppressWarnings(RNGkind("Knuth-TAOCP-2002", "Box-Muller", "Rounding"))
  f()
}

# Run f() from a different, empty working directory.
.elsewhere <- function(f) {
  d <- tempfile("elsewhere-")
  dir.create(d)
  old <- setwd(d)
  on.exit(setwd(old))
  f()
}

# Run f() with dplyr detached (MASS stays attached). Restores dplyr, then MASS on top.
.without_dplyr <- function(f) {
  if ("package:MASS" %in% search()) detach("package:MASS")
  if ("package:dplyr" %in% search()) detach("package:dplyr")
  on.exit(suppressPackageStartupMessages({
    library(dplyr, warn.conflicts = FALSE)
    if ("package:MASS" %in% search()) detach("package:MASS")
    library(MASS, warn.conflicts = FALSE)
  }))
  suppressPackageStartupMessages(library(MASS, warn.conflicts = FALSE))
  f()
}

# Free variables a function reads from outside (formals, locals, base excluded).
.free_vars <- function(fun) {
  b <- body(fun)
  assigned <- character(0)
  walk <- function(e) {
    if (is.call(e)) {
      h <- as.character(e[[1]])[1]
      if (h %in% c("<-", "=", "<<-") && is.symbol(e[[2]])) assigned <<- c(assigned, as.character(e[[2]]))
      args <- as.list(e)[-1]
      for (i in seq_along(args)) if (!identical(args[[i]], quote(expr = ))) walk(args[[i]])
    }
    invisible(NULL)
  }
  walk(b)
  v <- setdiff(all.vars(b), c(names(formals(fun)), assigned))
  v[!vapply(v, exists, logical(1), envir = baseenv())]
}

.rng_snapshot <- function() list(seed = get0(".Random.seed", envir = globalenv()), kind = RNGkind())
`;

/** Pin the RNG the way the briefs specify (used by reference computations). */
export const PINNED_SEED = `set.seed(seed, kind = "Mersenne-Twister", normal.kind = "Inversion", sample.kind = "Rejection")`;

export const rVector = (values: string[]) => `c(${values.map((v) => JSON.stringify(v)).join(", ")})`;
