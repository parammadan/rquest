import type { Lesson } from "../../domain/types.ts";

/*
 * World 2 lessons. Each one prepares for one Package Factory challenge and covers
 * chapters of the shared World 2 video. Package files and R CMD check output come from
 * a real labtools package built with R 4.6.1, roxygen2 8.1.1, and testthat 3.3.2.
 * Walkthroughs use different functions from the challenges, so the lessons teach
 * the pattern without handing over the answer.
 */

const available = { status: "available" } as const;

export const packageFactoryLessons: Lesson[] = [
  {
    id: "package-factory.lesson-1",
    kind: "lesson",
    missionId: "package-factory",
    title: "Package anatomy and the NAMESPACE",
    summary: "What each package file is for, what \"exported\" really means, and why R/ holds definitions only.",
    estimatedMinutes: 10,
    xp: 20,
    briefing:
      "The lab's helper script is becoming labtools. Before anyone installs it, you decide what is public. Right now, the internal helper is exported and the main function isn't.",
    objectives: [
      "Explain the job of DESCRIPTION, NAMESPACE, R/, man/, and tests/",
      "Tell exported functions from internal helpers",
      "Generate the NAMESPACE from @export tags instead of editing it",
      "Keep R/ files free of top-level code",
    ],
    keyPoints: [
      "DESCRIPTION is metadata and dependencies. NAMESPACE is the public interface.",
      "Only export() lines in NAMESPACE make a function public. A leading dot is a naming convention, not protection.",
      "Write @export in the roxygen block; roxygen2 writes NAMESPACE. Never edit it by hand.",
      "Files in R/ should only define functions, because top-level code runs whenever the package is built.",
    ],
    videoId: "package-factory.video",
    chapterIds: ["why-packages", "anatomy", "exports"],
    explanation: [
      {
        kind: "text",
        body: "A package is a folder with a fixed shape. Each part has one job, and R's tools rely on that shape when they build, install, and check the package.",
      },
      {
        kind: "file-tree",
        title: "labtools/",
        entries: [
          { name: "labtools/", depth: 0, dir: true },
          { name: "DESCRIPTION", depth: 1, note: "name, version, authors, license, dependencies" },
          { name: "NAMESPACE", depth: 1, note: "what users can call (generated)", highlight: true },
          { name: "R/", depth: 1, dir: true, note: "function definitions only" },
          { name: "clean_site.R", depth: 2, note: "exported" },
          { name: "summarise_arm.R", depth: 2, note: "exported" },
          { name: "utils.R", depth: 2, note: "internal helpers" },
          { name: "man/", depth: 1, dir: true, note: "help pages (generated)" },
          { name: "tests/testthat/", depth: 1, dir: true, note: "unit tests" },
        ],
        caption: "The real labtools layout used in the World 2 video.",
      },
      {
        kind: "text",
        body: "Exported functions are the public interface: users can call them after library(labtools). Everything else is internal, so you can rename or rewrite it without breaking anyone's analysis. Every export is a promise, so keep the list short.",
      },
      {
        kind: "code",
        code: '# tools exports file_ext(), but tools is not attached by default\n"file_ext" %in% getNamespaceExports("tools")\nexists("file_ext")\ntools::file_ext("enrollment.csv")',
        output: '[1] TRUE\n[1] FALSE\n[1] "csv"',
        caption: "Exported is not the same as attached: use pkg::fun() or library(pkg).",
        runnable: true,
      },
      {
        kind: "callout",
        tone: "warning",
        title: "A dot doesn't hide anything",
        body: "Naming a helper .normalise() only hides it from ls(). If its roxygen block says @export, roxygen2 writes export(.normalise) and it becomes public. Visibility is decided only by the NAMESPACE.",
      },
    ],
    walkthrough: {
      title: "Deciding what format_pvalue's package exports",
      code: "#' @export\n.round_p <- function(p) sprintf(\"%.3f\", p)\n\n#' Format p-values for a report\nformat_pvalue <- function(p) {\n  ifelse(p < 0.001, \"< 0.001\", .round_p(p))\n}",
      steps: [
        {
          title: "The starting point",
          note: "The helper .round_p() carries @export, and the function users need doesn't. After document(), the NAMESPACE would contain export(.round_p) only.",
          highlight: [1],
          output: "# NAMESPACE\nexport(.round_p)",
        },
        {
          title: "Un-export the helper",
          note: "Delete the roxygen block above the helper. Internal functions need no @export and no help page.",
          highlight: [1],
          code: ".round_p <- function(p) sprintf(\"%.3f\", p)\n\n#' Format p-values for a report\nformat_pvalue <- function(p) {\n  ifelse(p < 0.001, \"< 0.001\", .round_p(p))\n}",
        },
        {
          title: "Export the public function",
          note: "Add @export to format_pvalue()'s block. roxygen2 now writes export(format_pvalue).",
          highlight: [4],
          code: ".round_p <- function(p) sprintf(\"%.3f\", p)\n\n#' Format p-values for a report\n#' @export\nformat_pvalue <- function(p) {\n  ifelse(p < 0.001, \"< 0.001\", .round_p(p))\n}",
          output: "# NAMESPACE\nexport(format_pvalue)",
        },
        {
          title: "Document what users rely on",
          note: "Public means documented: describe the argument and the return value. These become the help page's Arguments and Value sections.",
          highlight: [4, 5],
          code: ".round_p <- function(p) sprintf(\"%.3f\", p)\n\n#' Format p-values for a report\n#' @param p Numeric vector of p-values.\n#' @return Character vector, e.g. \"< 0.001\" or \"0.021\".\n#' @export\nformat_pvalue <- function(p) {\n  ifelse(p < 0.001, \"< 0.001\", .round_p(p))\n}",
          output: 'format_pvalue(c(0.0004, 0.0213))\n[1] "< 0.001" "0.021"',
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "namespace-role",
        prompt: "Which file decides which functions users can call after library(labtools)?",
        options: [
          { id: "a", label: "DESCRIPTION", feedback: "DESCRIPTION holds metadata and declares dependencies, but it says nothing about which of your functions are public." },
          { id: "b", label: "NAMESPACE" },
          { id: "c", label: "R/utils.R", feedback: "R/ files define functions. Defining a function doesn't make it public." },
          { id: "d", label: "man/clean_site.Rd", feedback: "Rd files are help pages. A function can have a help page without being exported." },
        ],
        correctOptionId: "b",
        explanation: "export() lines in the NAMESPACE are the public interface, and roxygen2 writes them from your @export tags.",
      },
      {
        id: "dot-export",
        prompt: "A helper is named .normalise() and has #' @export above it. After devtools::document(), is it exported?",
        code: "#' @export\n.normalise <- function(x) toupper(trimws(x))",
        options: [
          { id: "a", label: "No, dot-prefixed functions are always private", feedback: "The leading dot only hides a name from ls(). It has no effect on the NAMESPACE." },
          { id: "b", label: "Yes, roxygen2 writes export(.normalise)" },
          { id: "c", label: "Only if it is also listed in DESCRIPTION", feedback: "DESCRIPTION lists packages you depend on, not your own functions." },
          { id: "d", label: "Only after R CMD check passes", feedback: "R CMD check reports problems but never changes your NAMESPACE." },
        ],
        correctOptionId: "b",
        explanation: "@export always produces an export() line. To keep a helper internal, give it no @export (or no roxygen block at all).",
      },
      {
        id: "top-level",
        prompt: "Why should files in R/ contain only function definitions?",
        options: [
          { id: "a", label: "Top-level code runs whenever the package is built, with side effects nobody asked for" },
          { id: "b", label: "R CMD check cannot parse library() calls", feedback: "It parses them fine. The problem is that the code executes at build time, not a parsing issue." },
          { id: "c", label: "roxygen2 only reads files that start with function", feedback: "roxygen2 reads every file. Top-level code is a design problem, not a roxygen limitation." },
          { id: "d", label: "Functions must be defined in alphabetical order", feedback: "Definition order inside R/ doesn't matter for ordinary functions." },
        ],
        correctOptionId: "a",
        explanation: "Code in R/ is evaluated when the package is built. Declare dependencies in DESCRIPTION and NAMESPACE, and put analysis steps in scripts or vignettes.",
      },
    ],
    challengeId: "package-factory.challenge-1",
    reward: { title: "NAMESPACE assembled", detail: "labtools now has a deliberate public interface." },
    check: { validatorId: "lesson-check:package-factory.lesson-1" },
    availability: available,
  },
  {
    id: "package-factory.lesson-2",
    kind: "lesson",
    missionId: "package-factory",
    title: "Documentation and dependencies",
    summary: "roxygen2 tags, the undocumented-argument warning, and declaring imports so check is quiet.",
    estimatedMinutes: 12,
    xp: 20,
    briefing:
      "R CMD check on labtools reports a WARNING and two NOTEs. An argument is undocumented, and the code calls functions the package never imported. You'll learn to read those messages and fix their causes.",
    objectives: [
      "Document every argument, the return value, and examples with roxygen2",
      "Read and fix the 'Undocumented arguments' warning",
      "Declare a dependency in DESCRIPTION and import its functions in NAMESPACE",
      "Explain why stats functions such as sd() need importing",
    ],
    keyPoints: [
      "Every argument needs @param, plus @return for the value. Docs and code must agree.",
      "DESCRIPTION Imports guarantees the package is installed. @importFrom (or pkg::fun) makes its functions available to your code.",
      "sd() and median() live in stats, not base, so they must be imported like any other dependency.",
      "Bare column names in dplyr verbs trigger a NOTE; the .data pronoun from rlang fixes it.",
    ],
    videoId: "package-factory.video",
    chapterIds: ["roxygen", "dependencies"],
    explanation: [
      {
        kind: "text",
        body: "roxygen2 turns #' comments into help pages. The first line is the title, @param documents an argument, @return the value, and @examples runnable code. Run devtools::document() to regenerate man/ and the NAMESPACE.",
      },
      {
        kind: "code",
        code: "* checking Rd \\usage sections ... WARNING\nUndocumented arguments in Rd file 'summarise_arm.Rd'\n  ‘na_rm’",
        caption: "Real R CMD check output: the function has an argument the help page never mentions.",
      },
      {
        kind: "dependency-map",
        title: "One dependency, declared twice",
        columns: [
          { title: "DESCRIPTION", lines: ["Imports: dplyr, rlang"], note: "Makes sure these packages are installed with yours." },
          { title: "NAMESPACE", lines: ["importFrom(dplyr, group_by, summarise)", "importFrom(rlang, .data)", "importFrom(stats, sd)"], note: "Makes these functions visible to your code." },
          { title: "R/summarise_arm.R", lines: ["group_by(df, .data$arm)", "summarise(...)", "sd(...)"], note: "Calls them. Or write dplyr::group_by() instead." },
        ],
        caption: "Generated from @importFrom tags in the roxygen block.",
      },
      {
        kind: "code",
        code: "# Where do these functions live?\nenvironmentName(environment(mean))\nenvironmentName(environment(sd))\nenvironmentName(environment(median))",
        output: '[1] "base"\n[1] "stats"\n[1] "stats"',
        caption: "mean() is base R; sd() and median() come from stats, so a package must import them.",
        runnable: true,
      },
      {
        kind: "code",
        code: "* checking R code for possible problems ... NOTE\nsummarise_arm: no visible global function definition for ‘group_by’\nsummarise_arm: no visible binding for global variable ‘arm’\nsummarise_arm: no visible global function definition for ‘sd’\nConsider adding\n  importFrom(\"stats\", \"sd\")",
        caption: "Real R CMD check output (excerpt) for the same broken function.",
      },
      {
        kind: "callout",
        tone: "tip",
        title: "Imports, Depends, Suggests",
        body: "Imports is the default for code your package calls. Depends also attaches the package for the user, which is rarely what you want. Suggests is for packages needed only by tests, examples, or vignettes, such as testthat.",
      },
    ],
    walkthrough: {
      title: "Making site_medians() check-clean",
      code: "#' Median outcome per site\n#' @param df Data frame with columns site and outcome.\n#' @return A tibble with one row per site.\n#' @export\nsite_medians <- function(df, digits = 1) {\n  out <- summarise(group_by(df, site), median = median(outcome))\n  out$median <- round(out$median, digits)\n  out\n}",
      steps: [
        {
          title: "Spot the problems",
          note: "digits has no @param (a WARNING). group_by, summarise, and median aren't imported, and site and outcome are bare column names (NOTEs).",
          highlight: [5, 6],
        },
        {
          title: "Document every argument",
          note: "Add @param digits. The WARNING disappears, because the docs and the function signature now agree.",
          highlight: [3],
          code: "#' Median outcome per site\n#' @param df Data frame with columns site and outcome.\n#' @param digits Decimal places to round to.\n#' @return A tibble with one row per site.\n#' @export\nsite_medians <- function(df, digits = 1) {\n  out <- summarise(group_by(df, site), median = median(outcome))\n  out$median <- round(out$median, digits)\n  out\n}",
        },
        {
          title: "Import what you call",
          note: "@importFrom writes importFrom() lines. median() comes from stats, so it needs one too. dplyr still has to be listed under Imports in DESCRIPTION.",
          highlight: [5, 6],
          code: "#' Median outcome per site\n#' @param df Data frame with columns site and outcome.\n#' @param digits Decimal places to round to.\n#' @return A tibble with one row per site.\n#' @importFrom dplyr group_by summarise\n#' @importFrom stats median\n#' @export\nsite_medians <- function(df, digits = 1) {\n  out <- summarise(group_by(df, site), median = median(outcome))\n  out$median <- round(out$median, digits)\n  out\n}",
        },
        {
          title: "Name columns with .data",
          note: "The .data pronoun tells R CMD check that site and outcome are columns, not undefined variables. Import it from rlang.",
          highlight: [7, 10],
          code: "#' Median outcome per site\n#' @param df Data frame with columns site and outcome.\n#' @param digits Decimal places to round to.\n#' @return A tibble with one row per site.\n#' @importFrom dplyr group_by summarise\n#' @importFrom stats median\n#' @importFrom rlang .data\n#' @export\nsite_medians <- function(df, digits = 1) {\n  out <- summarise(group_by(df, .data$site), median = median(.data$outcome))\n  out$median <- round(out$median, digits)\n  out\n}",
          output: "# A tibble: 2 × 2\n  site   median\n  <chr>   <dbl>\n1 BOS-01   10.8\n2 NYC-02    9.9",
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "undocumented",
        prompt: "R CMD check reports Undocumented arguments in Rd file 'summarise_arm.Rd' ‘na_rm’. What's the right fix?",
        options: [
          { id: "a", label: "Add #' @param na_rm … to the roxygen block and re-run document()" },
          { id: "b", label: "Edit man/summarise_arm.Rd by hand", feedback: "Rd files are generated. The next document() run overwrites manual edits, and the source of truth (the roxygen block) stays wrong." },
          { id: "c", label: "Add na_rm to the Imports field in DESCRIPTION", feedback: "Imports lists packages, not arguments." },
          { id: "d", label: "Rename the argument to .na_rm", feedback: "Renaming doesn't document anything. The warning would simply report .na_rm instead." },
        ],
        correctOptionId: "a",
        explanation: "Documentation is generated from the roxygen block, so fix it there: one @param per argument.",
      },
      {
        id: "sd-import",
        prompt: "sd() works fine in your console, but check says no visible global function definition for ‘sd’. Why?",
        options: [
          { id: "a", label: "sd() is deprecated", feedback: "sd() is alive and well. The issue is where it lives, not whether it exists." },
          { id: "b", label: "sd() lives in stats. Your package would only find it through whatever the user has attached, so it must be imported." },
          { id: "c", label: "testthat masks sd() during checks", feedback: "testthat doesn't define sd(). The message comes from static analysis of your code." },
          { id: "d", label: "DESCRIPTION must list base under Imports", feedback: "base is always available and must not be listed. sd() isn't in base, it's in stats." },
        ],
        correctOptionId: "b",
        explanation: "Your console attaches stats, but a package shouldn't depend on the user's search path. Add @importFrom stats sd (or call stats::sd()).",
      },
      {
        id: "imports-vs-namespace",
        prompt: "DESCRIPTION already says Imports: dplyr. Do you still need @importFrom dplyr … or dplyr:: in your code?",
        options: [
          { id: "a", label: "No, Imports attaches dplyr for you", feedback: "That's what Depends does. Imports only guarantees that dplyr is installed." },
          { id: "b", label: "No, roxygen2 reads Imports automatically", feedback: "roxygen2 writes the NAMESPACE from your tags. It never infers imports from DESCRIPTION." },
          { id: "c", label: "Yes. Imports guarantees installation; the NAMESPACE (or ::) makes functions available to your code" },
          { id: "d", label: "Only for functions used in tests", feedback: "Test-only packages belong in Suggests. The code in R/ needs imports regardless." },
        ],
        correctOptionId: "c",
        explanation: "DESCRIPTION and NAMESPACE answer different questions: is the package installed, and can my code see this function?",
      },
    ],
    challengeId: "package-factory.challenge-2",
    reward: { title: "Docs and imports wired", detail: "Every argument documented, every dependency declared. Check is quiet." },
    check: { validatorId: "lesson-check:package-factory.lesson-2" },
    availability: available,
  },
  {
    id: "package-factory.lesson-3",
    kind: "lesson",
    missionId: "package-factory",
    title: "Tests, checks, and releases",
    summary: "Runnable examples, testthat, R CMD build and check, and semantic versioning: everything a release needs.",
    estimatedMinutes: 12,
    xp: 20,
    briefing:
      "Release day for labtools 0.1.0. Before the analysis team installs it, every exported function needs complete docs, examples that run anywhere, tests, and a version number you can cite.",
    objectives: [
      "Write @examples that run on any machine",
      "Organise testthat tests next to the code they protect",
      "Use R CMD build and R CMD check and read their status",
      "Pick the right semantic version and record changes in NEWS",
    ],
    keyPoints: [
      "R CMD check runs every example, so examples must use inline data, not local files.",
      "Tests live in tests/testthat/, one file per source file, with testthat in Suggests.",
      "Aim for 0 errors, 0 warnings, 0 notes. In RQuest, checks are approximated in the browser; run the real check locally.",
      "Version 0.1.0 → 0.1.1 for a fix, 0.2.0 for a feature, 1.0.0 for a breaking change.",
    ],
    videoId: "package-factory.video",
    chapterIds: ["testing", "build-check", "releases", "your-mission"],
    explanation: [
      {
        kind: "file-tree",
        title: "Release-ready labtools",
        entries: [
          { name: "labtools/", depth: 0, dir: true },
          { name: "DESCRIPTION", depth: 1, note: "Version: 0.1.0 · Suggests: testthat" },
          { name: "NAMESPACE", depth: 1 },
          { name: "NEWS.md", depth: 1, note: "what changed, per version", highlight: true },
          { name: "R/", depth: 1, dir: true },
          { name: "man/", depth: 1, dir: true, note: "includes \\examples" },
          { name: "tests/", depth: 1, dir: true, highlight: true },
          { name: "testthat.R", depth: 2 },
          { name: "testthat/", depth: 2, dir: true },
          { name: "test-clean_site.R", depth: 3 },
          { name: "test-summarise_arm.R", depth: 3 },
        ],
      },
      {
        kind: "code",
        code: 'test_that("clean_site standardises codes and keeps NA", {\n  expect_equal(clean_site(c(" bos01", "NYC-02", NA)), c("BOS-01", "NYC-02", NA))\n})\n\ntest_that("clean_site handles empty input", {\n  expect_identical(clean_site(character(0)), character(0))\n})',
        output: "ℹ Testing labtools\nclean_site: ..\nsummarise_arm: .\n══ DONE ═══════════",
        caption: "tests/testthat/test-clean_site.R and the real devtools::test() output.",
      },
      {
        kind: "code",
        code: "$ R CMD build labtools\n* building ‘labtools_0.1.0.tar.gz’\n\n$ R CMD check --no-manual labtools_0.1.0.tar.gz\n* checking examples ... OK\n* checking tests ...\n  Running ‘testthat.R’ OK\nStatus: OK",
        caption: "Real output (excerpt). devtools::check() runs the same steps from inside R.",
      },
      {
        kind: "callout",
        tone: "warning",
        title: "What runs where",
        body: "R CMD check needs a full R installation with a shell, which a browser doesn't have. In RQuest, the boss mission builds your package with roxygen2 in webR and checks the NAMESPACE, help files, examples, and imports with R's own tools. Always run the real check locally before releasing.",
      },
      {
        kind: "code",
        code: '# Versions are not strings\n"0.10.0" > "0.9.0"\npackage_version("0.10.0") > package_version("0.9.0")\nutils::compareVersion("0.1.1", "0.1.0")',
        output: "[1] FALSE\n[1] TRUE\n[1] 1",
        caption: "Compare versions with package_version(): as text, 0.10.0 sorts before 0.9.0.",
        runnable: true,
      },
    ],
    walkthrough: {
      title: "Getting format_pvalue() release-ready",
      code: "#' Format p-values for a report\n#' @param p Numeric vector of p-values.\n#' @return Character vector.\n#' @export\nformat_pvalue <- function(p) {\n  ifelse(p < 0.001, \"< 0.001\", sprintf(\"%.3f\", p))\n}",
      steps: [
        { title: "Documented, but not demonstrated", note: "The help page has no examples, so users and R CMD check have nothing to run.", highlight: [1, 2, 3] },
        {
          title: "Add examples that run anywhere",
          note: "Use inline data only. R CMD check executes this code on every machine that checks the package.",
          highlight: [4, 5],
          code: "#' Format p-values for a report\n#' @param p Numeric vector of p-values.\n#' @return Character vector.\n#' @examples\n#' format_pvalue(c(0.0004, 0.0213))\n#' @export\nformat_pvalue <- function(p) {\n  ifelse(p < 0.001, \"< 0.001\", sprintf(\"%.3f\", p))\n}",
          output: '[1] "< 0.001" "0.021"',
        },
        {
          title: "Pin the behaviour with a test",
          note: "tests/testthat/test-format_pvalue.R records exactly what must stay true. A future edit that breaks it fails loudly.",
          highlight: [2],
          code: 'test_that("format_pvalue floors tiny p-values", {\n  expect_equal(format_pvalue(c(0.0004, 0.0213)), c("< 0.001", "0.021"))\n})',
        },
        {
          title: "Version and record the change",
          note: "Adding a function is a feature: bump 0.1.0 to 0.2.0 in DESCRIPTION, add a NEWS.md entry, and tag the release in git.",
          highlight: [1, 3],
          code: "# labtools 0.2.0\n\n* New format_pvalue() for report-ready p-values.\n\n# labtools 0.1.0\n\n* First release: clean_site(), summarise_arm().",
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "status",
        prompt: "R CMD check finishes with Status: 1 WARNING, 2 NOTEs. Is labtools ready to release?",
        options: [
          { id: "a", label: "Yes, only ERRORs block a release", feedback: "A WARNING means something is genuinely wrong (here, undocumented arguments). Notes need review too." },
          { id: "b", label: "No. Fix the warning and resolve or justify every note, aiming for 0/0/0" },
          { id: "c", label: "Yes, if the tests pass", feedback: "Passing tests are necessary, not sufficient. Check also audits docs, imports, and examples." },
          { id: "d", label: "Only once it's on CRAN", feedback: "Internal lab packages deserve the same bar. Teammates rely on them just as much." },
        ],
        correctOptionId: "b",
        explanation: "Treat warnings as bugs and notes as questions you must answer. A clean check is what makes a package trustworthy.",
      },
      {
        id: "examples",
        prompt: "Which @examples line is safe to ship?",
        options: [
          { id: "a", label: 'format_pvalue(read.csv("~/data/results.csv")$p)', feedback: "That file exists only on your machine, so the example fails during anyone else's check." },
          { id: "b", label: "format_pvalue(c(0.0004, 0.0213))" },
          { id: "c", label: "library(labtools)", feedback: "Loading the package demonstrates nothing, and examples already run with the package loaded." },
          { id: "d", label: 'download.file("https://…/p.csv", "p.csv")', feedback: "Examples must not need the network or write files. They run offline during checks." },
        ],
        correctOptionId: "b",
        explanation: "Examples run during every check, so they must be self-contained: small inline data, no files, no network.",
      },
      {
        id: "semver",
        prompt: "You fix a bug in clean_site() without changing its arguments or output format. What's the version after 0.1.0?",
        options: [
          { id: "a", label: "0.2.0", feedback: "A minor bump signals new features. A bug fix that changes no interface is a patch." },
          { id: "b", label: "1.0.0", feedback: "A major bump warns users that existing code may break, and nothing breaks here." },
          { id: "c", label: "0.1.1" },
          { id: "d", label: "Keep 0.1.0 and mention it in NEWS", feedback: "Then two different codebases would share one version number, and results couldn't be traced to the code." },
        ],
        correctOptionId: "c",
        explanation: "Patch versions are for bug fixes. Record the fix in NEWS.md so anyone citing 0.1.1 knows what changed.",
      },
    ],
    challengeId: "package-factory.boss",
    reward: { title: "Release-ready", detail: "Docs, examples, tests, and a version. labtools is ready to ship." },
    check: { validatorId: "lesson-check:package-factory.lesson-3" },
    availability: available,
  },
];
