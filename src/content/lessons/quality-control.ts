import type { Lesson } from "../../domain/types.ts";

/*
 * World 4 lessons. Each prepares for one Quality Control challenge and covers chapters of
 * the World 4 video. Outputs were produced with R 4.6.1, testthat 3.3.2, and rlang 1.3.0.
 * Walkthroughs use different functions from the challenges.
 */

const available = { status: "available" } as const;

export const qualityControlLessons: Lesson[] = [
  {
    id: "quality-control.lesson-1",
    kind: "lesson",
    missionId: "quality-control",
    title: "Tests that catch bugs",
    summary: "testthat expectations, and the question that separates useful tests from decoration: would this fail if the code were wrong?",
    estimatedMinutes: 10,
    xp: 20,
    briefing:
      "summarise_arm() will feed a report. Your tests will be run against the real function and against four subtly broken copies. Only tests that would actually catch a bug count.",
    objectives: [
      "Write test_that() blocks with expect_equal(), expect_identical(), and expect_error()",
      "Explain mutation testing: tests must fail on broken code",
      "Target the edges where bugs live: NA, empty input, single observations",
      "Read a testthat failure message",
    ],
    keyPoints: [
      "A test is only as good as the bugs it would catch.",
      "Asserting the type or shape of a result rarely catches logic errors. Assert specific values.",
      "expect_equal() allows tiny numeric differences; expect_identical() needs an exact match, type included.",
      "Most bugs hide at the edges: missing values, empty input, groups of one.",
    ],
    videoId: "quality-control.video",
    chapterIds: ["why-qc", "testthat", "mutants"],
    explanation: [
      {
        kind: "text",
        body: "A test_that() block names one behaviour and states what must be true with expectations. But a passing test only matters if it would fail when the code is wrong. Mutation testing makes that concrete: run your tests against deliberately broken copies (mutants) and check that each one is caught.",
      },
      {
        kind: "code",
        code: '# A mutant that forgets to multiply by 100\nmutant <- function(x) mean(is.na(x))\n\ntest_that("weak", expect_type(mutant(c(1, NA)), "double"))\ntest_that("strong", expect_equal(mutant(c(1, NA)), 50))',
        output: "Test passed with 1 success.\n── Failure: strong ──────────────────\nExpected `mutant(c(1, NA))` to equal 50.\nDifferences:\n1/1 mismatches\n[1] 0.5 - 50 == -49.5",
        caption: "Real testthat output (celebration emoji omitted). The weak test passes on broken code; the strong one catches it.",
      },
      {
        kind: "code",
        code: "pct_missing <- function(x) 100 * mean(is.na(x))\npct_missing(c(1, NA, 3, NA))\nidentical(length(1:2), 2)\nisTRUE(all.equal(length(1:2), 2))",
        output: "[1] 50\n[1] FALSE\n[1] TRUE",
        caption: "length() returns an integer and 2 is a double: equal, but not identical.",
        runnable: true,
      },
      {
        kind: "callout",
        tone: "tip",
        title: "Edge cases worth a test",
        body: "A group with a missing value, a group with exactly one observation, empty input, and input with the wrong type. Each is a place where a plausible bug changes the answer.",
      },
    ],
    walkthrough: {
      title: "Testing pct_missing() until it catches bugs",
      code: 'test_that("pct_missing works", {\n  expect_type(pct_missing(c(1, NA)), "double")\n})',
      steps: [
        { title: "A test that proves nothing", note: "Any function returning a number passes this, including a mutant that forgets the ×100.", highlight: [2] },
        {
          title: "Assert a value",
          note: "One NA out of two values is 50%. A mutant returning 0.5 now fails.",
          highlight: [2],
          code: 'test_that("pct_missing reports a percentage", {\n  expect_equal(pct_missing(c(1, NA)), 50)\n})',
        },
        {
          title: "Cover the edges",
          note: "No missing values, all missing, and a longer vector. Each catches a different plausible mistake.",
          highlight: [3, 4, 5],
          code: 'test_that("pct_missing reports a percentage", {\n  expect_equal(pct_missing(c(1, NA)), 50)\n  expect_equal(pct_missing(c(1, 2, 3)), 0)\n  expect_equal(pct_missing(c(NA, NA)), 100)\n  expect_equal(pct_missing(c(1, NA, 3, NA)), 50)\n})',
        },
        {
          title: "Decide what empty input means",
          note: "mean(logical(0)) is NaN. Decide the behaviour, then pin it with a test: here, refuse empty input with an error.",
          highlight: [1, 2],
          code: 'test_that("pct_missing rejects empty input", {\n  expect_error(pct_missing(numeric(0)))\n})',
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "weak-test",
        prompt: "A mutant of summarise_arm() counts missing outcomes in n. Which test catches it?",
        options: [
          { id: "a", label: "expect_true(is.data.frame(summarise_arm(df)))", feedback: "The mutant still returns a data frame, so this passes on broken code." },
          { id: "b", label: "expect_equal(nrow(summarise_arm(df)), 2)", feedback: "The mutant returns the same rows, just with the wrong n. Row counts don't change." },
          { id: "c", label: "An arm with one NA outcome: expect_equal(r$n[r$arm == \"A\"], 1)" },
          { id: "d", label: "expect_no_error(summarise_arm(df))", feedback: "The mutant runs without errors. Wrong answers are the problem, not crashes." },
        ],
        correctOptionId: "c",
        explanation: "Only a test that checks the specific value the bug changes, here n for a group containing NA, can tell the real function from the mutant.",
      },
      {
        id: "identical",
        prompt: "expect_identical(length(1:2), 2) fails with \"Objects equal but not identical\". Why?",
        options: [
          { id: "a", label: "length() returns an integer (2L) and 2 is a double" },
          { id: "b", label: "1:2 has three elements", feedback: "1:2 is c(1L, 2L), two elements. The values match; the types don't." },
          { id: "c", label: "expect_identical() is deprecated", feedback: "It's current and useful. It's strict about type, which is the point." },
          { id: "d", label: "Floating-point rounding", feedback: "2L and 2 are both exact. They're different types, not different values." },
        ],
        correctOptionId: "a",
        explanation: "Use expect_identical() when type matters (as with integer counts), and expect_equal() for numeric values that may differ by rounding.",
      },
      {
        id: "suite-passes",
        prompt: "Your test suite passes against the real function and against a mutant. What does that tell you?",
        options: [
          { id: "a", label: "The mutant is actually correct", feedback: "The mutant is broken by construction. Your tests just can't see where." },
          { id: "b", label: "The tests are too weak to detect that bug" },
          { id: "c", label: "Mutation testing doesn't apply to R", feedback: "It applies to any language. All it needs is a broken copy and your tests." },
          { id: "d", label: "You need more test files", feedback: "More files don't help if none of them checks the behaviour the mutant changes." },
        ],
        correctOptionId: "b",
        explanation: "Add an expectation on the exact behaviour the mutant changes, and confirm it fails on the mutant and passes on the real code.",
      },
    ],
    challengeId: "quality-control.challenge-1",
    reward: { title: "Mutant hunter", detail: "Your tests fail when the code is wrong, which is the whole point." },
    check: { validatorId: "lesson-check:quality-control.lesson-1" },
    availability: available,
  },
  {
    id: "quality-control.lesson-2",
    kind: "lesson",
    missionId: "quality-control",
    title: "Fail loudly, fail clearly",
    summary: "Validate inputs at the boundary with classed, informative errors, and test them precisely.",
    estimatedMinutes: 9,
    xp: 20,
    briefing:
      "Bad data reached an analysis and produced a confident, wrong table. Build the guard that stops it at the door, with errors a colleague can act on.",
    objectives: [
      "Validate inputs before analysis starts",
      "Write error messages that name the problem and the offender",
      "Raise classed errors with rlang::abort() or base errorCondition()",
      "Test errors with expect_error(class = , regexp = )",
    ],
    keyPoints: [
      'stopifnot() is quick but generic: "is.numeric(df$outcome) is not TRUE".',
      "A good message says which column, what was wrong, and which values caused it.",
      "A class such as rquest_invalid_input lets callers and tests target that specific error.",
      "Return valid input invisibly and unchanged, so validation can sit at the top of a pipeline.",
    ],
    videoId: "quality-control.video",
    chapterIds: ["defensive", "classed-errors"],
    explanation: [
      {
        kind: "code",
        code: 'df <- data.frame(outcome = c("12.1", "9.8"))\nstopifnot(is.numeric(df$outcome))',
        output: "Error: is.numeric(df$outcome) is not TRUE",
        caption: "Correct, but it doesn't say what the value was, or what to do.",
      },
      {
        kind: "code",
        code: 'check_numeric <- function(x, name) {\n  if (!is.numeric(x)) {\n    stop(errorCondition(\n      sprintf("%s must be numeric, not %s.", name, class(x)[1]),\n      class = "rquest_invalid_input"\n    ))\n  }\n  invisible(x)\n}\ne <- tryCatch(check_numeric(c("12.1", "9.8"), "outcome"), error = function(e) e)\nclass(e)\nconditionMessage(e)',
        output: '[1] "rquest_invalid_input" "error"                "condition"\n[1] "outcome must be numeric, not character."',
        caption: "Base R's errorCondition() creates a classed error. rlang::abort(msg, class = …) does the same with nicer formatting.",
        runnable: true,
      },
      {
        kind: "callout",
        tone: "tip",
        title: "Test the class and the message",
        body: 'expect_error(validate(bad), class = "rquest_invalid_input", regexp = "P002") passes only if the right kind of error is raised and its message names the duplicated id.',
      },
    ],
    walkthrough: {
      title: "Hardening validate_doses()",
      code: "validate_doses <- function(df) {\n  stopifnot(is.data.frame(df), is.numeric(df$dose_mg))\n  invisible(df)\n}",
      steps: [
        { title: "Generic guards", note: "These work, but the messages don't help anyone fix the data, and tests can't tell the errors apart.", highlight: [2] },
        {
          title: "Name missing columns",
          note: "Check the structure first. A message listing exactly what's missing saves a debugging session.",
          highlight: [2, 3, 4, 5, 6],
          code: 'validate_doses <- function(df) {\n  missing_cols <- setdiff(c("id", "dose_mg"), names(df))\n  if (length(missing_cols)) {\n    rlang::abort(paste("Missing column(s):", paste(missing_cols, collapse = ", ")),\n                 class = "rquest_invalid_input")\n  }\n  invisible(df)\n}',
        },
        {
          title: "Say what was wrong",
          note: "Report the type you got, not just the type you wanted.",
          highlight: [7, 8, 9],
          code: 'validate_doses <- function(df) {\n  missing_cols <- setdiff(c("id", "dose_mg"), names(df))\n  if (length(missing_cols)) {\n    rlang::abort(paste("Missing column(s):", paste(missing_cols, collapse = ", ")),\n                 class = "rquest_invalid_input")\n  }\n  if (!is.numeric(df$dose_mg)) {\n    rlang::abort(paste0("dose_mg must be numeric, not ", class(df$dose_mg)[1], "."), class = "rquest_invalid_input")\n  }\n  invisible(df)\n}',
        },
        {
          title: "Pin it with a test",
          note: "The class and the message pattern are both checked, so a different error won't pass by accident.",
          highlight: [2, 3],
          code: 'test_that("non-numeric doses are rejected", {\n  bad <- data.frame(id = "P01", dose_mg = "250")\n  expect_error(validate_doses(bad), class = "rquest_invalid_input", regexp = "numeric")\n})',
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "why-class",
        prompt: "Why give an error a class such as rquest_invalid_input?",
        options: [
          { id: "a", label: "So callers and tests can handle or check that specific error" },
          { id: "b", label: "R requires a class for every error", feedback: "Plain stop() errors work fine without a custom class. The class adds precision, not permission." },
          { id: "c", label: "It makes the error print in colour", feedback: "Formatting comes from the console and from rlang, not from your class name." },
          { id: "d", label: "It stops the error from propagating", feedback: "Classed errors still stop execution unless something explicitly catches them." },
        ],
        correctOptionId: "a",
        explanation: 'tryCatch(..., rquest_invalid_input = handler) and expect_error(class = "rquest_invalid_input") can both target it, without catching unrelated errors.',
      },
      {
        id: "best-message",
        prompt: "Which error message best helps a colleague with duplicated ids?",
        options: [
          { id: "a", label: '"Invalid input."', feedback: "True, but it doesn't say which check failed or which rows to fix." },
          { id: "b", label: '"anyDuplicated(df$id) == 0 is not TRUE"', feedback: "It describes the check, not the problem, and names no ids." },
          { id: "c", label: '"Duplicate id(s): P002, P017."' },
          { id: "d", label: '"Error in validate_trial()"', feedback: "R already shows where the error happened. The message should explain what went wrong." },
        ],
        correctOptionId: "c",
        explanation: "A good message states the problem and the exact offenders, so the fix is obvious.",
      },
      {
        id: "test-error",
        prompt: "Which expectation is most precise for the duplicate-id error?",
        options: [
          { id: "a", label: "expect_error(validate_trial(bad))", feedback: "Any error passes, including an unrelated bug that crashes earlier." },
          { id: "b", label: 'expect_error(validate_trial(bad), class = "rquest_invalid_input", regexp = "P002")' },
          { id: "c", label: "expect_warning(validate_trial(bad))", feedback: "Invalid input should stop with an error, not continue with a warning." },
          { id: "d", label: "expect_silent(validate_trial(bad))", feedback: "That asserts no error at all, which is the opposite of what you want." },
        ],
        correctOptionId: "b",
        explanation: "Checking the class and the message means the test passes for exactly this failure and no other.",
      },
    ],
    challengeId: "quality-control.challenge-2",
    reward: { title: "Gatekeeper", detail: "Bad data now stops at the boundary with a clear explanation." },
    check: { validatorId: "lesson-check:quality-control.lesson-2" },
    availability: available,
  },
  {
    id: "quality-control.lesson-3",
    kind: "lesson",
    missionId: "quality-control",
    title: "Independent QC and comparing tables",
    summary: "Double programming from the specification, tolerant numeric comparison, and a discrepancy report that finds real bugs.",
    estimatedMinutes: 11,
    xp: 20,
    briefing:
      "The production demographics table is done. Your job is to prove it right or wrong, independently, and report every discrepancy, but only real ones.",
    objectives: [
      "Explain independent double programming and why independence matters",
      "Compare numbers with a tolerance instead of ==",
      "Report discrepancies cell by cell: arm, column, production, QC",
      "Trace a discrepancy to its root cause",
    ],
    keyPoints: [
      "Program QC from the specification, not from the production code, or you'll copy its bugs.",
      "0.1 + 0.2 == 0.3 is FALSE in floating point. Compare with abs(a - b) > tolerance or all.equal().",
      "One row per mismatching cell, and zero rows when everything agrees.",
      "Every discrepancy needs an explanation before the table ships.",
    ],
    videoId: "quality-control.video",
    chapterIds: ["double-programming", "comparing", "discrepancies", "your-mission"],
    explanation: [
      {
        kind: "text",
        body: "In independent QC, a second programmer writes the same output from the specification without reading the production code. Agreement between two independent implementations is strong evidence; disagreement is a bug found before anyone relied on the table.",
      },
      {
        kind: "code",
        code: "0.1 + 0.2 == 0.3\nisTRUE(all.equal(0.1 + 0.2, 0.3))\nformat(0.1 + 0.2, digits = 17)\nabs((0.1 + 0.2) - 0.3) > 1e-8",
        output: '[1] FALSE\n[1] TRUE\n[1] "0.30000000000000004"\n[1] FALSE',
        caption: "Floating-point noise isn't a discrepancy. Compare against a tolerance.",
        runnable: true,
      },
      {
        kind: "code",
        code: "# Synthetic demographics: production vs independent QC (real values)\n#          arm  n age_mean age_sd pct_female\n# QC   Placebo 29    50.17  15.60      44.83\n# QC Treatment 31    51.58  15.98      48.39\n# production pct_female: 44.83, 25.00",
        caption: "Only one cell disagrees: production divided Treatment's female count by all 60 subjects instead of the arm's 31.",
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Don't peek",
        body: "If the QC programmer reads the production code first, they tend to reproduce its logic, and its bugs. Work from the spec, then compare outputs.",
      },
    ],
    walkthrough: {
      title: "Comparing two lab-value tables",
      code: 'prod <- data.frame(test = c("ALT", "AST"), mean = c(31.2, 28.40000000001))\nqc   <- data.frame(test = c("ALT", "AST"), mean = c(31.25, 28.4))\nprod$mean == qc$mean',
      steps: [
        { title: "Exact comparison", note: "== flags both rows, including AST, which differs only by rounding noise.", highlight: [3], output: "[1] FALSE FALSE" },
        {
          title: "Compare with a tolerance",
          note: "Differences smaller than the tolerance are agreement. Only ALT is a real discrepancy.",
          highlight: [2],
          code: 'compare <- function(prod, qc, tolerance = 1e-8) {\n  d <- abs(prod$mean - qc$mean)\n  prod[d > tolerance, "test"]\n}\ncompare(prod, qc)',
          output: '[1] "ALT"',
        },
        {
          title: "Report it usefully",
          note: "A discrepancy row should carry both values, so a reviewer can judge it without re-running anything.",
          highlight: [3, 4],
          code: 'compare <- function(prod, qc, tolerance = 1e-8) {\n  d <- abs(prod$mean - qc$mean)\n  bad <- d > tolerance\n  data.frame(test = prod$test[bad], column = "mean", prod = prod$mean[bad], qc = qc$mean[bad])\n}\ncompare(prod, qc)',
          output: "  test column prod    qc\n1  ALT   mean 31.2 31.25",
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "independence",
        prompt: "What makes double programming independent?",
        options: [
          { id: "a", label: "The QC programmer writes the output from the specification without reading the production code" },
          { id: "b", label: "QC re-runs the production script on a different computer", feedback: "Re-running the same code reproduces the same bugs. It checks the environment, not the logic." },
          { id: "c", label: "QC uses a different programming language", feedback: "Language doesn't matter. What matters is that the logic was derived independently." },
          { id: "d", label: "QC reviews the production code line by line", feedback: "Code review is valuable, but it isn't independent programming. Reviewers tend to accept plausible logic." },
        ],
        correctOptionId: "a",
        explanation: "Independence means two derivations of the same result from the spec. Then agreement is meaningful.",
      },
      {
        id: "tolerance",
        prompt: "Production age_mean is 50.17241379310345 and QC gives 50.172413793103445. Discrepancy?",
        options: [
          { id: "a", label: "Yes, the values aren't identical", feedback: "The difference is floating-point noise around 1e-14, far below any meaningful tolerance." },
          { id: "b", label: "No, the difference is below a sensible tolerance such as 1e-8" },
          { id: "c", label: "Only if the numbers print differently", feedback: "Printing rounds. Compare the values numerically against a tolerance." },
          { id: "d", label: "Yes, QC must match production to every digit", feedback: "Exact matching flags rounding noise and buries the real discrepancies." },
        ],
        correctOptionId: "b",
        explanation: "abs(prod - qc) > tolerance separates real disagreements from arithmetic noise.",
      },
      {
        id: "root-cause",
        prompt: "Production says Treatment is 25.0% female; QC says 48.4%. The arm has 31 subjects, 15 of them female, out of 60 in total. Root cause?",
        options: [
          { id: "a", label: "QC rounded incorrectly", feedback: "15/31 = 48.4%. QC's arithmetic is right." },
          { id: "b", label: "Production divided by all 60 subjects instead of the arm's 31" },
          { id: "c", label: "The data set is missing SEX values", feedback: "Both programs counted the same 15 females. The denominators differ." },
          { id: "d", label: "Floating-point error", feedback: "A 23-point gap is far beyond floating-point noise." },
        ],
        correctOptionId: "b",
        explanation: "15/60 = 25.0%. A percentage within an arm needs the arm's own count as the denominator.",
      },
    ],
    challengeId: "quality-control.boss",
    reward: { title: "QC signed off", detail: "Two independent programs agree, and the one bug that slipped in is documented." },
    check: { validatorId: "lesson-check:quality-control.lesson-3" },
    availability: available,
  },
];
