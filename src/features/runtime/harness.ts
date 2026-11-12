/**
 * The R grader, installed once per webR session before any learner code runs.
 *
 * Evaluating R_GRADER returns a list of functions (prepare, learn, check, tampered).
 * The caller keeps that list as a JavaScript handle; nothing is bound in the global
 * environment, so learner code has no name to replace or rebind.
 *
 * Defense in depth (browser-level hardening, not tamper-proof grading):
 * - The grader's functions are enclosed by a private environment whose only parent is
 *   a copy of base R taken at install time (then emptyenv). Learner globals such as
 *   `assign("isTRUE", function(x) TRUE, envir = globalenv())` cannot reach them.
 * - Learner code and the challenge setup share one environment (validators rely on
 *   `.learner_env`), but checks are evaluated through a locked "trusted" environment
 *   in front of it: pristine base R plus copies of every setup binding made *before*
 *   the learner's code ran (plain setup environments are copied too). Setup helpers are
 *   re-enclosed in it. So shadowing
 *   `identical`, or rebinding a validator helper such as `.mutants`, does not change
 *   what a check sees, while learner-defined functions still resolve.
 * - Checks run one per call, after the learner's code has finished, so top-level
 *   learner code never sees the check expressions.
 * - After the learner's code and after every check, base R's function bindings are
 *   compared with the install-time snapshot. Any change (unlockBinding + assign,
 *   trace(), ...) refuses grading; the caller then restarts R.
 *
 * Learner code runs in the same process, so a learner who deliberately walks the call
 * stack (sys.frames(), unlockBinding on the grader's environments) can still interfere.
 * Grades produced in the browser are evidence of learning, not a certification.
 */
export const R_GRADER = String.raw`
local({
  snap <- as.list(baseenv(), all.names = TRUE)
  B <- list2env(snap, parent = emptyenv())
  lockEnvironment(B, bindings = TRUE)
  G <- new.env(parent = B)
  assign("snap", snap, envir = G)

  evalq({
    # Active bindings (e.g. .Library.site) compute a fresh value on every read; skip them.
    active <- vapply(names(snap), bindingIsActive, logical(1), env = baseenv())
    # .Last.value and .Traceback are rewritten by R itself after top-level calls.
    volatile <- names(snap) %in% c(".Last.value", ".Traceback")
    is_fun <- vapply(snap, is.function, logical(1)) & !active & !volatile
    fun_names <- names(snap)[is_fun]
    # Pristine base for the trusted overlay: every function, plus plain constants
    # (T, F, pi, letters, R.version.string, ...). Internal dot-values are left out.
    overlay_vals <- snap[!active & !volatile & (is_fun | !startsWith(names(snap), "."))]

    tampered <- function() {
      now_base <- mget(fun_names, envir = baseenv(), ifnotfound = list(NULL))
      now_ns <- mget(fun_names, envir = .BaseNamespaceEnv, ifnotfound = list(NULL))
      same <- vapply(seq_along(fun_names), function(i) {
        identical(now_base[[i]], snap[[fun_names[i]]]) && identical(now_ns[[i]], snap[[fun_names[i]]])
      }, logical(1))
      fun_names[!same]
    }

    # A fresh working directory and an environment holding the challenge setup.
    prepare <- function(setup) {
      d <- tempfile("rquest-")
      dir.create(d)
      setwd(d)
      env <- new.env(parent = globalenv())
      eval(parse(text = setup, keep.source = FALSE), envir = env)
      env
    }

    # Checks see pristine base R and the setup as it was before the learner's code ran.
    trusted <- function(env, code) {
      tr <- list2env(overlay_vals, parent = env)
      own <- as.list(env, all.names = TRUE)
      for (n in names(own)) {
        v <- own[[n]]
        if (is.function(v) && !is.primitive(v) && identical(environment(v), env)) environment(v) <- tr
        # Plain environments made by the setup (e.g. a build cache) are copied now, so
        # learner code cannot pre-fill what the checks will read.
        if (is.environment(v) && !identical(v, env) && !isNamespace(v) && !identical(v, globalenv()) && !identical(v, baseenv())) {
          v <- list2env(as.list(v, all.names = TRUE), parent = parent.env(v))
        }
        assign(n, v, envir = tr)
      }
      assign(".rq_code", code, envir = tr)
      lockEnvironment(tr, bindings = TRUE)
      tr
    }

    # Run the learner's code. Returns list(status, message, state).
    learn <- function(code, setup) {
      env <- prepare(setup)
      tr <- trusted(env, code)
      parsed <- tryCatch(parse(text = code, keep.source = FALSE), error = function(e) e)
      if (inherits(parsed, "error")) {
        return(list(status = "syntax", message = conditionMessage(parsed), state = NULL))
      }
      err <- tryCatch({
        suppressWarnings(suppressMessages(utils::capture.output(
          for (ex in parsed) eval(ex, envir = env)
        )))
        NULL
      }, error = function(e) conditionMessage(e))
      bad <- tampered()
      if (length(bad)) return(list(status = "tamper", message = paste(bad, collapse = ", "), state = NULL))
      if (!is.null(err)) return(list(status = "error", message = err, state = NULL))
      list(status = "ok", message = "", state = tr)
    }

    # Evaluate one check. Only "PASS", "FAIL", or "TAMPER" comes back;
    # printed output cannot influence the verdict.
    check <- function(state, expr) {
      ok <- tryCatch({
        res <- FALSE
        utils::capture.output(suppressWarnings(suppressMessages(
          res <- isTRUE(eval(parse(text = expr, keep.source = FALSE), envir = new.env(parent = state)))
        )))
        res
      }, error = function(e) FALSE)
      if (length(tampered())) return("TAMPER")
      if (isTRUE(ok)) "PASS" else "FAIL"
    }
  }, G)

  lockEnvironment(G, bindings = TRUE)
  list(prepare = G$prepare, learn = G$learn, check = G$check, tampered = G$tampered)
})
`;
