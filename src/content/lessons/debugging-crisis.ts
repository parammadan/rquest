import type { Lesson } from "../../domain/types.ts";

/*
 * World 3 lessons. Each prepares for one Debugging Crisis challenge and covers chapters
 * of the World 3 video. Outputs were produced with R 4.6.1 (dplyr 1.2.1, MASS attached
 * after dplyr). Walkthroughs use different functions from the challenges.
 */

const available = { status: "available" } as const;

export const debuggingCrisisLessons: Lesson[] = [
  {
    id: "debugging-crisis.lesson-1",
    kind: "lesson",
    missionId: "debugging-crisis",
    title: "Masking and the search path",
    summary: "How R finds a function by name, why attach order changes behaviour, and how qualified calls end the problem.",
    estimatedMinutes: 10,
    xp: 20,
    briefing:
      "The overnight pipeline died with \"unused arguments\" in code nobody touched. Another script now attaches MASS after dplyr. Find out which select() is really running, then make the code immune.",
    objectives: [
      "Explain how R searches for a function name",
      "Diagnose masking with search(), environment(), and conflicts()",
      "Fix masking with pkg::fun() instead of attach order",
      "Know what a bare filter() means when dplyr isn't attached",
    ],
    keyPoints: [
      "R looks up names along the search path: the global environment, then attached packages from newest to oldest.",
      "environment(fun) reveals which package's version you're calling.",
      "Inside functions, call dplyr::select() and dplyr::filter(). Qualified calls don't care what is attached.",
      "Without dplyr attached, filter() is stats::filter(), a time-series filter.",
    ],
    videoId: "debugging-crisis.video",
    chapterIds: ["works-yesterday", "search-path", "qualified-calls"],
    explanation: [
      {
        kind: "text",
        body: "When code calls select(), R looks for that name along the search path: your global environment first, then each attached package, newest first. Attaching MASS after dplyr puts MASS::select() in front, and its arguments are completely different.",
      },
      {
        kind: "code",
        code: 'library(dplyr)\nlibrary(MASS)\nhead(search(), 4)\nenvironment(select)\nselect(trial, arm, outcome)',
        output: '[1] ".GlobalEnv"    "package:MASS"  "package:dplyr" "package:stats"\n<environment: namespace:MASS>\nError in select(trial, arm, outcome) : \n  unused arguments (arm, outcome)',
        caption: "Real output. The error names the arguments, not the cause.",
      },
      {
        kind: "code",
        code: '# Your own definitions mask packages too\nmean <- function(x, ...) "masked!"\nmean(1:3)\nbase::mean(1:3)\nrm(mean)\nmean(1:3)',
        output: '[1] "masked!"\n[1] 2\n[1] 2',
        caption: "The global environment comes first on the search path. pkg:: always reaches the real function.",
        runnable: true,
      },
      {
        kind: "callout",
        tone: "tip",
        title: "Calling library() again doesn't help",
        body: "If dplyr is already attached, library(dplyr) does nothing. It doesn't move dplyr back in front of MASS. Qualify the calls instead.",
      },
    ],
    walkthrough: {
      title: "Unmasking recent_visits()",
      code: 'library(dplyr)\nlibrary(MASS)\n\nrecent_visits <- function(df) {\n  df |> filter(visit == "Week 12") |> select(id, visit)\n}\n\nrecent_visits(visits)',
      steps: [
        { title: "Reproduce the failure", note: "MASS is attached last, so select() resolves to MASS::select().", highlight: [2, 5], output: "Error in select(...) : unused arguments (id, visit)" },
        { title: "Confirm the diagnosis", note: "Ask R which namespace owns the select() you're calling.", highlight: [1], code: "environment(select)", output: "<environment: namespace:MASS>" },
        {
          title: "Qualify every dplyr verb",
          note: "dplyr::select() and dplyr::filter() are found directly in dplyr's namespace, whatever the search path looks like.",
          highlight: [2],
          code: 'recent_visits <- function(df) {\n  df |> dplyr::filter(visit == "Week 12") |> dplyr::select(id, visit)\n}\n\nrecent_visits(visits)',
          output: "   id   visit\n1 P01 Week 12",
        },
        {
          title: "No library() needed at all",
          note: "The function no longer relies on dplyr being attached. It only needs dplyr installed.",
          highlight: [1, 2, 3],
          code: 'recent_visits <- function(df) {\n  df |> dplyr::filter(visit == "Week 12") |> dplyr::select(id, visit)\n}',
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "why-unused",
        prompt: "After library(dplyr); library(MASS), select(df, arm) fails with unused argument (arm). Why?",
        options: [
          { id: "a", label: "MASS was attached later, so MASS::select() is found first" },
          { id: "b", label: "dplyr's select() is broken in this version", feedback: "dplyr::select(df, arm) works fine. The problem is which select() gets called, not dplyr itself." },
          { id: "c", label: "The data frame has no arm column", feedback: "A missing column gives a different error from dplyr. \"Unused argument\" means the function doesn't accept that argument at all." },
          { id: "d", label: "Column names must be quoted in select()", feedback: "dplyr::select() accepts bare column names. The call never reaches dplyr." },
        ],
        correctOptionId: "a",
        explanation: "Packages attached later sit earlier on the search path. MASS::select() takes completely different arguments.",
      },
      {
        id: "which-select",
        prompt: "Which call tells you which package's select() you're about to call?",
        options: [
          { id: "a", label: 'packageVersion("dplyr")', feedback: "That tells you dplyr's version, not whether dplyr's select() is the one being found." },
          { id: "b", label: "environment(select)" },
          { id: "c", label: "sessionInfo()", feedback: "It lists attached packages, but not which of them supplies select()." },
          { id: "d", label: "library(dplyr)", feedback: "Re-attaching an attached package changes nothing and reveals nothing." },
        ],
        correctOptionId: "b",
        explanation: "environment(select) prints the owning namespace, e.g. <environment: namespace:MASS>.",
      },
      {
        id: "robust-fix",
        prompt: "What's the most robust fix inside a function?",
        options: [
          { id: "a", label: "Make sure dplyr is attached last", feedback: "That depends on every script and every user keeping the same attach order. It breaks again the next time someone adds a library() call." },
          { id: "b", label: "detach(\"package:MASS\") first", feedback: "That breaks anything that needs MASS, and the function still depends on the search path." },
          { id: "c", label: "Call dplyr::select() and dplyr::filter()" },
          { id: "d", label: "Rename the columns", feedback: "The columns aren't the problem. The wrong function is being called." },
        ],
        correctOptionId: "c",
        explanation: "Qualified calls go straight to the right namespace, so the function works whatever is attached, even with dplyr not attached.",
      },
    ],
    challengeId: "debugging-crisis.challenge-1",
    reward: { title: "Search path mapped", detail: "You can find, prove, and fix any masking bug." },
    check: { validatorId: "lesson-check:debugging-crisis.lesson-1" },
    availability: available,
  },
  {
    id: "debugging-crisis.lesson-2",
    kind: "lesson",
    missionId: "debugging-crisis",
    title: "Scope and pure functions",
    summary: "Lexical scoping, free variables that leak in from the global environment, and how to write functions that only depend on their arguments.",
    estimatedMinutes: 9,
    xp: 20,
    briefing:
      "flag_signals() gives different answers on different days, and its alpha argument seems to do nothing. Somewhere, a global variable is making decisions it shouldn't.",
    objectives: [
      "Explain lexical scoping: where R looks up names a function wasn't given",
      "Find free variables with codetools::findGlobals()",
      "Rewrite a function so everything arrives through its arguments",
      "Choose defaults that don't read global state",
    ],
    keyPoints: [
      "A name a function wasn't given is looked up where the function was defined, usually the global environment.",
      "Changing that global variable silently changes every result.",
      "codetools::findGlobals(f, merge = FALSE)$variables lists the outside variables a function reads.",
      "A pure function's result depends only on its arguments. Give arguments sensible literal defaults.",
    ],
    videoId: "debugging-crisis.video",
    chapterIds: ["scoping", "pure-functions"],
    explanation: [
      {
        kind: "text",
        body: "R uses lexical scoping: when a function uses a name it wasn't given, R looks in the environment where the function was defined, then that environment's parents. For a function written in a script, that means the global environment, where anyone can change the value.",
      },
      {
        kind: "code",
        code: "threshold <- 0.05\nflag <- function(p) p < threshold\nflag(0.04)\nthreshold <- 0.01\nflag(0.04)",
        output: "[1] TRUE\n[1] FALSE",
        caption: "Same call, different answer: the function depends on a global it never receives.",
        runnable: true,
      },
      {
        kind: "code",
        code: "codetools::findGlobals(flag_signals, merge = FALSE)$variables",
        output: '[1] "threshold"',
        caption: "codetools ships with R (it's a recommended package). Run this on your machine to audit a function.",
      },
      {
        kind: "callout",
        tone: "warning",
        title: "A default can still be a global",
        body: "function(p, alpha = threshold) looks safe, but the default is evaluated inside the function, so it still reads the global threshold. findGlobals() still reports it. Use a literal default such as alpha = 0.05.",
      },
    ],
    walkthrough: {
      title: "Making to_mg() pure",
      code: "unit_factor <- 1000\n\nto_mg <- function(dose_g) dose_g * unit_factor\n\nto_mg(0.25)",
      steps: [
        { title: "A hidden dependency", note: "to_mg() multiplies by unit_factor, a variable it was never given.", highlight: [1, 3], output: "[1] 250" },
        {
          title: "Find the free variable",
          note: "findGlobals() reports exactly which outside variables the function reads.",
          highlight: [1],
          code: "codetools::findGlobals(to_mg, merge = FALSE)$variables",
          output: '[1] "unit_factor"',
        },
        {
          title: "Pass it in, with a literal default",
          note: "The factor is now an argument with a fixed default. Callers can override it, and nothing outside can change it silently.",
          highlight: [1],
          code: "to_mg <- function(dose_g, factor = 1000) dose_g * factor\n\nto_mg(0.25)",
          output: "[1] 250",
        },
        {
          title: "Verify it's pure",
          note: "No outside variables are read any more.",
          highlight: [1],
          code: "codetools::findGlobals(to_mg, merge = FALSE)$variables",
          output: "character(0)",
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "lookup",
        prompt: "flag_signals() uses threshold but isn't passed it. Where does R look for threshold?",
        options: [
          { id: "a", label: "In the environment where the function was defined (usually global), then its parents" },
          { id: "b", label: "In the environment of whoever calls the function", feedback: "That would be dynamic scoping. R uses lexical scoping: the definition environment, not the call site." },
          { id: "c", label: "Nowhere: R raises an error for unknown names", feedback: "R only errors if the name isn't found anywhere up the enclosing environments. Here it finds the global variable." },
          { id: "d", label: "Only inside the stats namespace", feedback: "Namespaces are searched for code inside packages. A script function looks in the global environment." },
        ],
        correctOptionId: "a",
        explanation: "Lexical scoping means the function sees the environment it was created in, which for script code is the global environment.",
      },
      {
        id: "findglobals",
        prompt: 'codetools::findGlobals(f, merge = FALSE)$variables returns "threshold". What does that tell you?',
        options: [
          { id: "a", label: "threshold is defined twice", feedback: "findGlobals() doesn't look for duplicates. It lists names the function reads from outside." },
          { id: "b", label: "f reads a variable it wasn't given as an argument" },
          { id: "c", label: "threshold is a function", feedback: "Functions are reported in $functions. $variables lists non-function names." },
          { id: "d", label: "f modifies threshold", feedback: "It reports reads. Assigning with <<- would be a separate (and worse) problem." },
        ],
        correctOptionId: "b",
        explanation: "Every name in $variables is outside state that can change the function's result without its arguments changing.",
      },
      {
        id: "pure",
        prompt: "Which version of flag_signals() is pure?",
        options: [
          { id: "a", label: "function(p, alpha = threshold) p < alpha", feedback: "The default is evaluated inside the function and still reads the global threshold." },
          { id: "b", label: "function(p, alpha) { threshold <<- alpha; p < threshold }", feedback: "<<- writes to the global environment, adding a side effect on top of the dependency." },
          { id: "c", label: "function(p, alpha = 0.05) p < alpha" },
          { id: "d", label: 'function(p) p < get("threshold")', feedback: "get() still fetches the global variable. It just hides the dependency better." },
        ],
        correctOptionId: "c",
        explanation: "Everything the result depends on arrives through arguments, and the default is a literal.",
      },
    ],
    challengeId: "debugging-crisis.challenge-2",
    reward: { title: "Scope sealed", detail: "Your functions answer only to their arguments." },
    check: { validatorId: "lesson-check:debugging-crisis.lesson-2" },
    availability: available,
  },
  {
    id: "debugging-crisis.lesson-3",
    kind: "lesson",
    missionId: "debugging-crisis",
    title: "Session-proof code and provenance",
    summary: "Working directories, global options, restoring state with on.exit(), and recording what a result ran on.",
    estimatedMinutes: 11,
    xp: 20,
    briefing:
      "The report works on its author's laptop and fails in the overnight job. Make it produce the same output from any directory, under any options, with or without dplyr attached, and make it say exactly what it ran on.",
    objectives: [
      "Build file paths from arguments instead of the working directory",
      "Format report numbers independently of options(OutDec)",
      "Restore any global state you change with on.exit()",
      "Record provenance: R version, package versions, input checksum",
    ],
    keyPoints: [
      'A relative path like "visits.csv" is resolved against getwd(), which differs between sessions.',
      'format(), formatC(), and print() follow options(OutDec). sprintf("%.2f", x) always uses ".".',
      "Change global state only with old <- options(...); on.exit(options(old)), or use withr.",
      "Return R.version.string, packageVersion() values, and tools::md5sum() of inputs alongside results.",
    ],
    videoId: "debugging-crisis.video",
    chapterIds: ["working-directory", "options", "side-effects", "provenance", "your-mission"],
    explanation: [
      {
        kind: "code",
        code: 'read.csv("visits.csv")',
        output: "Error in file(file, \"rt\") : cannot open the connection\nIn addition: Warning message:\nIn file(file, \"rt\") :\n  cannot open file 'visits.csv': No such file or directory",
        caption: "Real output from a session whose working directory doesn't contain the file.",
      },
      {
        kind: "text",
        body: 'Pass the data location in as an argument and build the path with file.path(data_dir, "visits.csv"). The caller decides where the data lives, and the function works from any working directory.',
      },
      {
        kind: "code",
        code: 'x <- 10.3875\nold <- options(OutDec = ",")\nformat(round(x, 2), nsmall = 2)\nsprintf("%.2f", x)\noptions(old)\ngetOption("OutDec")',
        output: '[1] "10,39"\n[1] "10.39"\n[1] "."',
        caption: "format() follows the session's decimal mark; sprintf() doesn't. The last line confirms the option was restored.",
        runnable: true,
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Put it back, even on error",
        body: "Writing options(digits = 7) at the end of a function is skipped if anything fails first, and it assumes 7 was the old value. Save the old value and restore it with on.exit(), which always runs.",
      },
      {
        kind: "callout",
        tone: "tip",
        title: "renv, on your own machine",
        body: "Recording versions tells you what ran. renv goes further: renv.lock pins every package version so a project can be restored exactly. It needs a full R installation, so RQuest's browser workspace doesn't run it.",
      },
    ],
    walkthrough: {
      title: "Hardening write_summary()",
      code: 'write_summary <- function(df) {\n  d <- read.csv("results.csv")\n  paste0("Mean: ", format(round(mean(d$value), 2), nsmall = 2))\n}',
      steps: [
        { title: "Three hidden dependencies", note: "The working directory, options(OutDec), and nothing recorded about the run.", highlight: [2, 3] },
        {
          title: "Path from an argument",
          note: "file.path() builds the path from data_dir, so the function works from any working directory.",
          highlight: [1, 2],
          code: 'write_summary <- function(data_dir) {\n  path <- file.path(data_dir, "results.csv")\n  d <- utils::read.csv(path)\n  paste0("Mean: ", format(round(mean(d$value), 2), nsmall = 2))\n}',
        },
        {
          title: "Session-independent formatting",
          note: 'sprintf() always uses "." as the decimal mark, whatever options(OutDec) says.',
          highlight: [4],
          code: 'write_summary <- function(data_dir) {\n  path <- file.path(data_dir, "results.csv")\n  d <- utils::read.csv(path)\n  sprintf("Mean: %.2f", mean(d$value))\n}',
          output: 'sprintf("Mean: %.2f", 10.3875)\n[1] "Mean: 10.39"',
        },
        {
          title: "Record provenance",
          note: "Return what the result ran on, so anyone can confirm they're reproducing the same thing.",
          highlight: [5, 6, 7, 8],
          code: 'write_summary <- function(data_dir) {\n  path <- file.path(data_dir, "results.csv")\n  d <- utils::read.csv(path)\n  list(\n    text = sprintf("Mean: %.2f", mean(d$value)),\n    r_version = R.version.string,\n    input_md5 = unname(tools::md5sum(path))\n  )\n}',
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "relative-path",
        prompt: 'read.csv("visits.csv") works on your laptop but fails in the scheduled job. Most likely cause?',
        options: [
          { id: "a", label: "The relative path is resolved against a different working directory" },
          { id: "b", label: "The scheduled job's R has no read.csv()", feedback: "read.csv() is in utils, which every R installation has. The error says the file can't be opened." },
          { id: "c", label: "The CSV file is corrupted", feedback: "A corrupt file gives parsing errors. \"cannot open file … No such file or directory\" means it wasn't found." },
          { id: "d", label: "The job runs an older R version", feedback: "Reading a CSV by path hasn't changed between versions. The path is the problem." },
        ],
        correctOptionId: "a",
        explanation: 'Relative paths depend on getwd(). Pass the directory in and use file.path(data_dir, "visits.csv").',
      },
      {
        id: "outdec",
        prompt: 'With options(OutDec = ","), which call still produces "10.39" for x <- 10.3875?',
        options: [
          { id: "a", label: "format(round(x, 2), nsmall = 2)", feedback: 'format() follows OutDec and gives "10,39".' },
          { id: "b", label: 'formatC(x, format = "f", digits = 2)', feedback: 'formatC()\'s decimal.mark defaults to getOption("OutDec"), so it also gives "10,39".' },
          { id: "c", label: 'sprintf("%.2f", x)' },
          { id: "d", label: "print(round(x, 2))", feedback: "Printing uses OutDec too. It shows 10,39." },
        ],
        correctOptionId: "c",
        explanation: 'sprintf() uses C formatting and always writes ".", so report text doesn\'t change with the session.',
      },
      {
        id: "restore",
        prompt: "Your function needs options(digits = 3) temporarily. What's the correct pattern?",
        options: [
          { id: "a", label: "options(digits = 3) at the start and options(digits = 7) at the end", feedback: "If anything fails in between, the reset never runs. It also assumes the caller's value was 7." },
          { id: "b", label: "old <- options(digits = 3); on.exit(options(old))" },
          { id: "c", label: "digits <- 3 inside the function", feedback: "That creates a local variable called digits. It has no effect on options(digits)." },
          { id: "d", label: "Leave it set: callers can reset it", feedback: "That's a side effect every caller now has to know about. Well-behaved functions clean up after themselves." },
        ],
        correctOptionId: "b",
        explanation: "options() returns the old values; on.exit() restores them however the function exits, including after an error.",
      },
    ],
    challengeId: "debugging-crisis.boss",
    reward: { title: "Session-proof", detail: "Your report runs anywhere and says exactly what it ran on." },
    check: { validatorId: "lesson-check:debugging-crisis.lesson-3" },
    availability: available,
  },
];
