import type { ValidatorDefinition } from "../../domain/evaluation.ts";

/*
 * World 2 validators: package checks that run inside webR.
 *
 * R CMD check needs a shell and a compiler, which the browser doesn't have.
 * Instead, the learner's R/labtools.R is written into a real package
 * skeleton, roxygen2 generates NAMESPACE and man/*.Rd from it, and the checks
 * inspect those artefacts with R's own tools (parseNamespaceFile,
 * tools::parse_Rd, tools::checkRd, tools::Rd2ex). These are the same signals
 * R CMD check reports on for these topics: exports, Rd validity, documented
 * arguments, runnable examples, and undefined global functions.
 */

const DESCRIPTION = [
  "Package: labtools",
  "Title: Helpers for Synthetic Lab Data",
  "Version: 0.1.0",
  'Authors@R: person("Demo", "Learner", role = c("aut", "cre"), email = "learner@example.org")',
  "Description: Cleaning and summary helpers shared across the lab's analyses.",
  "License: GPL-3",
  "Encoding: UTF-8",
  "Imports: dplyr",
];

/** Shared R helpers, evaluated as challenge setup in the learner's environment. */
const PACKAGE_HELPERS = String.raw`
suppressPackageStartupMessages(library(dplyr))
.learner_env <- environment()
.pkg_state <- new.env()
.description <- ${"c(" + DESCRIPTION.map((l) => JSON.stringify(l)).join(", ") + ")"}

# Build the package once per validation: write files, run roxygen2.
.build <- function() {
  if (!is.null(.pkg_state$result)) return(.pkg_state$result)
  unlink("labtools", recursive = TRUE)
  dir.create("labtools/R", recursive = TRUE)
  writeLines(.description, "labtools/DESCRIPTION")
  writeLines(get(".rq_code", envir = globalenv()), "labtools/R/labtools.R")
  res <- tryCatch({
    suppressMessages(suppressWarnings(
      roxygen2::roxygenise("labtools", load_code = roxygen2::load_source)
    ))
    list(ok = TRUE, ns = parseNamespaceFile("labtools", "."))
  }, error = function(e) list(ok = FALSE, error = conditionMessage(e)))
  .pkg_state$result <- res
  res
}

.ns <- function() {
  b <- .build()
  if (!isTRUE(b$ok)) stop("package did not build")
  b$ns
}

# Parsed Rd for a topic: tags present, documented arguments, checkRd problems.
.rd <- function(topic) {
  .build()
  f <- file.path("labtools", "man", paste0(topic, ".Rd"))
  if (!file.exists(f)) return(NULL)
  rd <- tools::parse_Rd(f)
  tags <- vapply(rd, function(x) attr(x, "Rd_tag"), "")
  arg_text <- character(0)
  for (sec in rd[tags == "\\arguments"]) {
    for (it in sec) {
      if (identical(attr(it, "Rd_tag"), "\\item")) {
        nm <- trimws(paste(unlist(it[[1]]), collapse = ""))
        txt <- trimws(paste(unlist(it[[2]]), collapse = ""))
        for (n in strsplit(nm, ",\\s*")[[1]]) arg_text[[n]] <- txt
      }
    }
  }
  list(rd = rd, tags = tags, args = names(arg_text), arg_text = arg_text,
       problems = tools::checkRd(rd))
}

# Every argument documented with a non-empty description; title, value present.
.documented <- function(fn, need_examples = FALSE) {
  i <- .rd(fn)
  if (is.null(i) || length(i$problems) > 0L) return(FALSE)
  f <- names(formals(get(fn, envir = .learner_env)))
  all(f %in% i$args) && all(nzchar(i$arg_text[f])) &&
    all(c("\\title", "\\value") %in% i$tags) &&
    (!need_examples || "\\examples" %in% i$tags)
}

# Names of functions called in an expression (pkg::fun calls excluded).
.calls <- function(e) {
  if (!is.call(e)) return(character(0))
  parts <- as.list(e)
  keep <- !vapply(seq_along(parts), function(i) identical(parts[[i]], quote(expr = )), logical(1))
  h <- e[[1]]
  if (is.symbol(h)) {
    hn <- as.character(h)
    if (hn %in% c("::", ":::")) return(character(0))
    idx <- which(keep)[-1]
    return(c(hn, unlist(lapply(idx, function(i) .calls(parts[[i]])))))
  }
  unlist(lapply(which(keep), function(i) .calls(parts[[i]])))
}

# Like R CMD check's "no visible global function definition".
.undefined <- function(fn) {
  fun <- get(fn, envir = .learner_env)
  ns <- .ns()
  imported <- unlist(lapply(ns$imports, function(i) if (is.list(i)) i[[2]] else getNamespaceExports(i)))
  own <- ls(.learner_env, all.names = TRUE)
  g <- setdiff(unique(.calls(body(fun))), names(formals(fun)))
  g[!vapply(g, exists, logical(1), envir = baseenv()) & !(g %in% c(imported, own))]
}

.learner_functions <- function() {
  nms <- setdiff(ls(.learner_env, all.names = TRUE), .setup_names)
  nms[vapply(nms, function(n) is.function(get(n, envir = .learner_env)), logical(1))]
}

# Run a topic's examples; FALSE if missing or erroring.
.examples_run <- function(fn) {
  i <- .rd(fn)
  if (is.null(i) || !("\\examples" %in% i$tags)) return(FALSE)
  f <- tempfile(fileext = ".R")
  tools::Rd2ex(i$rd, out = f)
  file.exists(f) && tryCatch({
    utils::capture.output(source(f, local = new.env(parent = .learner_env)))
    TRUE
  }, error = function(e) FALSE)
}

lab <- data.frame(
  arm = rep(c("Placebo", "Treatment"), each = 6),
  outcome = c(9.8, 10.4, 11.1, 9.5, 10.9, 10.2, 12.7, NA, 13.4, 12.1, 13.9, 12.8)
)

.setup_names <- c(ls(all.names = TRUE), ".setup_names")
`;

const BUILDS = {
  id: "builds",
  description: "roxygen2 builds NAMESPACE and man/ from your comments",
  hint: "Every roxygen line starts with #'. Look for a stray tag or an unclosed block.",
  expr: `isTRUE(.build()$ok)`,
};

export const exportsValidator: ValidatorDefinition = {
  validatorId: "webr:package-checks:package-factory.challenge-1",
  challengeId: "package-factory.challenge-1",
  timeoutMs: 30_000,
  setup: PACKAGE_HELPERS,
  checks: [
    BUILDS,
    {
      id: "exported",
      description: "NAMESPACE exports clean_site()",
      hint: "Add #' @export to clean_site()'s roxygen block.",
      expr: `"clean_site" %in% .ns()$exports`,
    },
    {
      id: "internal",
      description: "The .normalise() helper stays internal (no exportPattern either)",
      hint: "Remove @export from .normalise(); an internal helper needs no roxygen block at all.",
      expr: `!(".normalise" %in% .ns()$exports) && length(.ns()$exportPatterns) == 0L`,
    },
    {
      id: "rd",
      description: "man/clean_site.Rd exists and passes tools::checkRd()",
      hint: "clean_site() needs a roxygen block with a title line.",
      expr: `local({ i <- .rd("clean_site"); !is.null(i) && length(i$problems) == 0L })`,
    },
    {
      id: "documented",
      description: "Title, a description for x, and @return are all documented",
      hint: "Write @param x followed by a description, and add an @return line.",
      expr: `.documented("clean_site")`,
    },
    {
      id: "works",
      description: "clean_site() still behaves correctly",
      hint: "Documentation changes shouldn't change behaviour — keep calling .normalise().",
      expr: `base::identical(clean_site(c(" bos01", "NYC-02", NA)), c("BOS-01", "NYC-02", NA))`,
    },
  ],
};

const SUMMARY_MATCHES = String.raw`
.matches <- function(got, df) {
  got <- as.data.frame(got)
  if (!all(c("arm", "mean", "sd") %in% names(got))) return(FALSE)
  got <- got[order(as.character(got$arm)), ]
  isTRUE(base::all.equal(as.numeric(got$mean), as.vector(tapply(df$outcome, df$arm, mean, na.rm = TRUE)))) &&
    isTRUE(base::all.equal(as.numeric(got$sd), as.vector(tapply(df$outcome, df$arm, stats::sd, na.rm = TRUE))))
}
`;

export const dependenciesValidator: ValidatorDefinition = {
  validatorId: "webr:package-checks:package-factory.challenge-2",
  challengeId: "package-factory.challenge-2",
  timeoutMs: 30_000,
  setup: PACKAGE_HELPERS,
  checks: [
    BUILDS,
    {
      id: "exported",
      description: "summarise_arm() is exported",
      hint: "Keep the #' @export tag.",
      expr: `"summarise_arm" %in% .ns()$exports`,
    },
    {
      id: "documented",
      description: "Every argument is documented — including na_rm",
      hint: "Add #' @param na_rm with a short description.",
      expr: `.documented("summarise_arm")`,
    },
    {
      id: "globals",
      description: "No undefined global functions (group_by, summarise, sd are imported or pkg::-qualified)",
      hint: "Add #' @importFrom dplyr group_by summarise and #' @importFrom stats sd — or call dplyr::group_by() etc.",
      expr: `length(.undefined("summarise_arm")) == 0L`,
    },
    {
      id: "works",
      description: "Mean and SD per arm are unchanged",
      hint: "Only the declarations should change, not the computation.",
      expr: `local({ ${SUMMARY_MATCHES}; .matches(summarise_arm(lab), lab) })`,
    },
    {
      id: "na-rm",
      description: "na_rm = FALSE is respected",
      hint: "Pass na_rm through to both mean() and sd().",
      expr: `local({
        r <- as.data.frame(summarise_arm(lab, na_rm = FALSE))
        is.na(r$mean[r$arm == "Treatment"]) && !is.na(r$mean[r$arm == "Placebo"])
      })`,
    },
  ],
};

export const shipLabtoolsValidator: ValidatorDefinition = {
  validatorId: "webr:package-checks:package-factory.boss",
  challengeId: "package-factory.boss",
  timeoutMs: 45_000,
  setup: PACKAGE_HELPERS,
  checks: [
    BUILDS,
    {
      id: "api",
      description: "Exports exactly clean_site() and summarise_arm()",
      hint: "Export the two public functions; keep any helpers internal.",
      expr: `base::setequal(.ns()$exports, c("clean_site", "summarise_arm")) && length(.ns()$exportPatterns) == 0L`,
    },
    {
      id: "docs",
      description: "Both exports have valid Rd: title, every argument, @return, and @examples",
      hint: "Each exported function needs @param for every argument, @return, and an @examples section.",
      expr: `.documented("clean_site", need_examples = TRUE) && .documented("summarise_arm", need_examples = TRUE)`,
    },
    {
      id: "examples",
      description: "Every example runs without error",
      hint: "Examples run as written — use small inline data, e.g. data.frame(arm = ..., outcome = ...).",
      expr: `.examples_run("clean_site") && .examples_run("summarise_arm")`,
    },
    {
      id: "globals",
      description: "No undefined global functions anywhere in the package",
      hint: "Import every non-base function you call (dplyr, stats, …) or qualify it with pkg::.",
      expr: `all(vapply(.learner_functions(), function(f) length(.undefined(f)) == 0L, logical(1)))`,
    },
    {
      id: "clean-site",
      description: "clean_site() works on unseen codes, keeping NA",
      hint: "Trim, upper-case, insert the hyphen; leave NA as NA.",
      expr: `base::identical(clean_site(c("sea07", NA, " lax-11", "Mia12")), c("SEA-07", NA, "LAX-11", "MIA-12"))`,
    },
    {
      id: "summarise-arm",
      description: "summarise_arm() is correct on an unseen three-arm dataset",
      hint: "Return one row per arm with columns arm, mean, and sd; honour na_rm.",
      expr: `local({
        ${SUMMARY_MATCHES}
        set.seed(11)
        d <- data.frame(arm = sample(c("A", "B", "C"), 36, replace = TRUE), outcome = round(rnorm(36, 4, 1), 2))
        d$outcome[c(3, 20)] <- NA
        .matches(summarise_arm(d), d)
      })`,
    },
  ],
};
