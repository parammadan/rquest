import type { Lesson } from "../../domain/types.ts";

/*
 * World 1 lessons. Each lesson covers chapters of the shared World 1 video,
 * explains the concepts in writing, steps through code, and ends with a
 * knowledge check. Code outputs were produced with R 4.6.1.
 */

const available = { status: "available" } as const;

export const dataLabLessons: Lesson[] = [
  {
    id: "data-lab.lesson-1",
    kind: "lesson",
    missionId: "data-lab",
    title: "Vectors, functions, and missing values",
    summary: "The building blocks of R: one-type vectors, your first function, and how R represents missing data.",
    estimatedMinutes: 10,
    xp: 20,
    briefing:
      "A collaborator's export has site codes in four spellings and a gap in the outcomes. Before you can clean anything, you need R's three core ideas: the vector, the function, and NA.",
    objectives: [
      "Create vectors with c() and inspect them with typeof() and length()",
      "Explain why mixing types silently converts a vector",
      "Write a small function that cleans every element at once",
      "Find, count, and deliberately drop missing values",
    ],
    keyPoints: [
      "A vector holds values of one type; mixing types coerces everything to the most general type.",
      "Most R functions are vectorized: they act on every element without a loop.",
      "A function returns the last value it computes.",
      "NA is contagious by design. Use is.na() to find it and na.rm = TRUE only on purpose.",
    ],
    videoId: "data-lab.video",
    chapterIds: ["why-r", "vectors", "functions", "missing"],
    explanation: [
      {
        kind: "text",
        body: "Everything in R is built from vectors: ordered collections of values that all share one type. c() combines values into a vector. typeof() tells you the type and length() the number of elements.",
      },
      {
        kind: "code",
        code: 'sites <- c("BOS-01", "bos01", "NYC-02", " nyc-02", NA, "CHI-03")\ntypeof(sites)\nlength(sites)\ntoupper(sites)',
        output: '[1] "character"\n[1] 6\n[1] "BOS-01"  "BOS01"   "NYC-02"  " NYC-02" NA        "CHI-03"',
        caption: "toupper() changes every element at once. No loop needed.",
        runnable: true,
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Silent coercion",
        body: 'c(1, "2") becomes the character vector "1" "2". One stray character in a numeric column turns the whole column into text, so check types whenever data arrives.',
      },
      {
        kind: "text",
        body: "R marks missing values as NA. Any calculation that touches an NA is itself NA: R refuses to guess. Find gaps with is.na(), count them with sum(), and drop them only when you mean to.",
      },
      {
        kind: "code",
        code: "outcome <- c(10.2, NA, 11.6, 9.8)\nmean(outcome)\nis.na(outcome)\nsum(is.na(outcome))\nmean(outcome, na.rm = TRUE)",
        output: "[1] NA\n[1] FALSE  TRUE FALSE FALSE\n[1] 1\n[1] 10.53333",
        runnable: true,
      },
    ],
    walkthrough: {
      title: "Building clean_site(), step by step",
      code: 'clean_site <- function(x) {\n  x <- toupper(trimws(x))\n  sub("^([A-Z]+)-?([0-9]+)$", "\\\\1-\\\\2", x)\n}\n\nclean_site(sites)',
      steps: [
        { title: "Declare the function", note: "clean_site takes one argument, x: a whole vector of raw codes.", highlight: [1, 4] },
        {
          title: "Trim, then upper-case",
          note: 'trimws() removes stray spaces and toupper() normalises case. " bos01" becomes "BOS01".',
          highlight: [2],
          output: '[1] "BOS01"',
        },
        {
          title: "Insert the hyphen",
          note: "sub() matches letters, an optional hyphen, then digits, and rebuilds them as letters-hyphen-digits. As the last expression, its value is returned.",
          highlight: [3],
          output: '[1] "BOS-01"',
        },
        {
          title: "Clean every code at once",
          note: "Because every step is vectorized, one call cleans the whole vector. NA stays NA.",
          highlight: [6],
          output: '[1] "BOS-01" "BOS-01" "NYC-02" "NYC-02" NA       "CHI-03"',
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "coercion",
        prompt: "What does this produce?",
        code: 'c(1, "2")',
        options: [
          { id: "a", label: "A numeric vector: 1 2", feedback: "A vector holds one type, so combining a number with text can't stay numeric." },
          { id: "b", label: 'A character vector: "1" "2"' },
          { id: "c", label: "An error: types can't be mixed", feedback: "R doesn't error here. It coerces silently, which is exactly what makes this a common bug." },
          { id: "d", label: "A list holding a number and a string", feedback: "c() builds an atomic vector. A list would need list(1, \"2\")." },
        ],
        correctOptionId: "b",
        explanation: "A vector holds one type, so R coerces the number to text. That conversion is silent, which is why it causes bugs.",
      },
      {
        id: "na-mean",
        prompt: "What does R return?",
        code: "mean(c(10.2, NA, 11.6))",
        options: [
          { id: "a", label: "10.9", feedback: "That's mean(c(10.2, 11.6)). R won't drop the NA unless you ask with na.rm = TRUE." },
          { id: "b", label: "NA" },
          { id: "c", label: "0", feedback: "R never substitutes zero for missing data." },
          { id: "d", label: "An error", feedback: "NA in arithmetic isn't an error. The result is simply NA." },
        ],
        correctOptionId: "b",
        explanation: "NA is contagious: the mean of values that include an unknown is unknown. Use na.rm = TRUE to drop it deliberately.",
      },
      {
        id: "vectorized",
        prompt: "Predict the output.",
        code: 'toupper(trimws(" bos01"))',
        options: [
          { id: "a", label: '"BOS01"' },
          { id: "b", label: '" BOS01"', feedback: "trimws() removes the leading space before toupper() runs." },
          { id: "c", label: '"BOS-01"', feedback: "Neither function inserts a hyphen. That's sub()'s job." },
          { id: "d", label: '"bos01"', feedback: "toupper() converts every letter to upper case." },
        ],
        correctOptionId: "a",
        explanation: "trimws() removes the leading space, then toupper() upper-cases it. Inserting the hyphen is sub()'s job.",
      },
    ],
    challengeId: "data-lab.challenge-1",
    check: { validatorId: "lesson-check:data-lab.lesson-1" },
    availability: available,
  },
  {
    id: "data-lab.lesson-2",
    kind: "lesson",
    missionId: "data-lab",
    title: "Data frames and grouped summaries",
    summary: "Tables made of vectors, logical filtering, and dplyr summaries with precise definitions of n.",
    estimatedMinutes: 8,
    xp: 20,
    briefing:
      "The study team needs Week 12 results by treatment arm. One placebo outcome is missing. Your summary has to say exactly what it counts.",
    objectives: [
      "Describe a data frame as a set of equal-length column vectors",
      "Select columns with $ and rows with a logical condition",
      "Build a filter → group_by → summarise pipeline",
      "Tell rows from non-missing observations",
    ],
    keyPoints: [
      "Each data frame column is a vector, and all columns have the same length.",
      'df[condition, ] keeps rows; the empty slot after the comma means "all columns".',
      "n() counts rows in a group, not observations. Count non-missing values with sum(!is.na(x)).",
    ],
    videoId: "data-lab.video",
    chapterIds: ["data-frames", "grouped-summaries"],
    explanation: [
      {
        kind: "text",
        body: "A data frame is a table built from vectors: every column is a vector, and every column has the same length. $ pulls out one column, and a logical condition inside [ ] keeps the rows where it is TRUE.",
      },
      {
        kind: "code",
        code: 'trial <- data.frame(\n  id = c("P01", "P02", "P03", "P04", "P05", "P06"),\n  arm = rep(c("Placebo", "Treatment"), 3),\n  visit = c(rep("Week 12", 4), "Baseline", "Baseline"),\n  outcome = c(10.2, 12.9, NA, 13.4, 9.7, 12.1)\n)\ntrial$outcome\nnrow(trial[trial$visit == "Week 12", ])',
        output: "[1] 10.2 12.9   NA 13.4  9.7 12.1\n[1] 4",
        runnable: true,
      },
      {
        kind: "callout",
        tone: "tip",
        title: "Rows are not observations",
        body: "Placebo has two Week 12 rows but only one observed outcome. n() reports 2. State what you count, and count non-missing values explicitly.",
      },
    ],
    walkthrough: {
      title: "A grouped summary with dplyr",
      code: 'library(dplyr)\ntrial |>\n  filter(visit == "Week 12") |>\n  group_by(arm) |>\n  summarise(\n    rows = n(),\n    n    = sum(!is.na(outcome)),\n    mean = mean(outcome, na.rm = TRUE)\n  )',
      steps: [
        { title: "Start from the data", note: "The native pipe |> passes trial into each next step.", highlight: [2] },
        { title: "Keep Week 12", note: "filter() keeps rows where the condition is TRUE: four rows remain.", highlight: [3] },
        { title: "Split by arm", note: "group_by() makes every later summary per arm.", highlight: [4] },
        {
          title: "Summarise precisely",
          note: "rows counts rows; n counts observed outcomes; mean ignores the missing value on purpose. (Tibbles print 3 significant digits: 13.15 shows as 13.2.)",
          highlight: [6, 7, 8],
          output: "# A tibble: 2 × 4\n  arm        rows     n  mean\n  <chr>     <int> <int> <dbl>\n1 Placebo       2     1  10.2\n2 Treatment     2     2  13.2",
        },
      ],
    },
    knowledgeCheck: [
      {
        id: "columns",
        prompt: "In a data frame, every column must…",
        options: [
          { id: "a", label: "have the same type as the others", feedback: "Columns can differ in type: a character id next to a numeric outcome." },
          { id: "b", label: "have the same length as the others" },
          { id: "c", label: "be numeric", feedback: "Data frames routinely mix character, numeric, logical, and date columns." },
          { id: "d", label: "contain unique values", feedback: "Duplicates are allowed. Uniqueness is something you check, not something R enforces." },
        ],
        correctOptionId: "b",
        explanation: "Columns can have different types (character id, numeric outcome), but they're all vectors of the same length: one value per row.",
      },
      {
        id: "n-rows",
        prompt: "Placebo has two Week 12 rows, and one of them has a missing outcome. What does n() report for Placebo?",
        options: [
          { id: "a", label: "1", feedback: "1 is the number of observed outcomes, sum(!is.na(outcome)). n() counts rows." },
          { id: "b", label: "2" },
          { id: "c", label: "NA", feedback: "n() never returns NA. It counts rows, missing or not." },
          { id: "d", label: "0", feedback: "Both rows exist in the group, so the count isn't zero." },
        ],
        correctOptionId: "b",
        explanation: "n() counts rows in the group. The number of observations is sum(!is.na(outcome)), which is 1.",
      },
      {
        id: "filter-rows",
        prompt: "Which expression returns only the Week 12 rows (all columns)?",
        options: [
          { id: "a", label: 'trial[trial$visit == "Week 12", ]' },
          { id: "b", label: 'trial$visit == "Week 12"', feedback: "That returns a logical vector, one TRUE/FALSE per row, not the rows themselves." },
          { id: "c", label: 'trial["Week 12"]', feedback: "Single brackets with a string select a column named \"Week 12\", which doesn't exist." },
          { id: "d", label: 'trial[visit == "Week 12"]', feedback: "visit isn't a variable on its own. Use trial$visit, and put the condition before a comma." },
        ],
        correctOptionId: "a",
        explanation: "The condition goes before the comma (rows); the empty slot after it keeps all columns. Option b returns a logical vector, not rows.",
      },
    ],
    challengeId: "data-lab.challenge-2",
    check: { validatorId: "lesson-check:data-lab.lesson-2" },
    availability: available,
  },
  {
    id: "data-lab.lesson-3",
    kind: "lesson",
    missionId: "data-lab",
    title: "From raw export to analysis-ready data",
    summary: "Read safely, parse mixed date formats, set factor levels explicitly, de-duplicate, and check the result.",
    estimatedMinutes: 8,
    xp: 20,
    briefing:
      "The enrollment export has inconsistent sites, blank ages, a duplicated participant, and dates written three ways. Turn it into one trustworthy row per participant.",
    objectives: [
      "Read every column as text so no conversion happens silently",
      "Parse several date formats one at a time",
      "Create factors with explicit levels",
      "Remove duplicates and verify the result",
    ],
    keyPoints: [
      'colClasses = "character" means you choose every conversion yourself.',
      "as.Date() returns NA when the format doesn't match, so parse in passes and fill the gaps.",
      "factor(x, levels = ...) fixes the order and turns unexpected spellings into NA instead of new levels.",
      "Finish by checking: one row per participant, and only the NAs you expect.",
    ],
    videoId: "data-lab.video",
    chapterIds: ["messy-export", "your-mission"],
    explanation: [
      {
        kind: "text",
        body: 'Read raw exports with colClasses = "character". Nothing is converted behind your back, and each fix is a small, named step you can test.',
      },
      {
        kind: "code",
        code: 'd <- c("2026-01-05", "01/12/2026", "15 Jan 2026")\ndt <- as.Date(d, format = "%Y-%m-%d")\ndt[is.na(dt)] <- as.Date(d[is.na(dt)], format = "%m/%d/%Y")\ndt[is.na(dt)] <- as.Date(d[is.na(dt)], format = "%d %b %Y")\ndt',
        output: '[1] "2026-01-05" "2026-01-12" "2026-01-15"',
        caption: "Each pass fills only the dates still missing.",
        runnable: true,
      },
      {
        kind: "callout",
        tone: "tip",
        title: "Explicit factor levels",
        body: 'factor(arm, levels = c("Placebo", "Treatment")) states the order you want and makes a typo like "Placebp" show up as NA, rather than quietly adding a third arm.',
      },
    ],
    walkthrough: {
      title: "Parsing three date formats",
      code: 'd <- c("2026-01-05", "01/12/2026", "15 Jan 2026")\ndt <- as.Date(d, format = "%Y-%m-%d")\ndt[is.na(dt)] <- as.Date(d[is.na(dt)], format = "%m/%d/%Y")\ndt[is.na(dt)] <- as.Date(d[is.na(dt)], format = "%d %b %Y")',
      steps: [
        { title: "Raw text", note: "Three formats in one column, a common sight in multi-site exports.", highlight: [1] },
        { title: "Pass 1: ISO", note: "Only the ISO date matches; the others become NA.", highlight: [2], output: '[1] "2026-01-05" NA           NA' },
        { title: "Pass 2: US format", note: "Fill only the gaps, using month/day/year.", highlight: [3], output: '[1] "2026-01-05" "2026-01-12" NA' },
        { title: "Pass 3: day month year", note: "The last gap is filled. Every date is now a real Date.", highlight: [4], output: '[1] "2026-01-05" "2026-01-12" "2026-01-15"' },
      ],
    },
    knowledgeCheck: [
      {
        id: "colclasses",
        prompt: 'Why read a raw export with colClasses = "character"?',
        options: [
          { id: "a", label: "So nothing is converted silently. You choose and test every conversion." },
          { id: "b", label: "It makes read.csv() faster", feedback: "Speed isn't the point. Avoiding silent type guessing is." },
          { id: "c", label: "read.csv() requires it for CSV files", feedback: "read.csv() guesses types by default. colClasses is optional." },
          { id: "d", label: "It removes missing values", feedback: "It doesn't touch missing values; na.strings controls what counts as NA." },
        ],
        correctOptionId: "a",
        explanation: "Automatic type guessing can turn IDs into numbers or dates into text. Reading as character puts every conversion in your code.",
      },
      {
        id: "date-na",
        prompt: "What does this return?",
        code: 'as.Date("01/12/2026", format = "%Y-%m-%d")',
        options: [
          { id: "a", label: '"2026-01-12"', feedback: "The text doesn't match \"%Y-%m-%d\", so it can't be parsed." },
          { id: "b", label: "NA" },
          { id: "c", label: "An error", feedback: "as.Date() returns NA instead of erroring when the text doesn't match the format." },
          { id: "d", label: '"2026-12-01"', feedback: "No date is parsed with a mismatched format. The result is NA." },
        ],
        correctOptionId: "b",
        explanation: "When the text doesn't match the format, as.Date() returns NA rather than failing, which is what makes the pass-by-pass approach work.",
      },
      {
        id: "factor-levels",
        prompt: 'Why write factor(arm, levels = c("Placebo", "Treatment")) instead of factor(arm)?',
        options: [
          { id: "a", label: "It sorts the data frame by arm", feedback: "factor() never reorders rows." },
          { id: "b", label: "It is required before calling lm()", feedback: "lm() accepts character predictors. Explicit levels are about correctness and order." },
          { id: "c", label: "It fixes the level order and turns unexpected spellings into NA instead of new levels" },
          { id: "d", label: "It runs faster on large data", feedback: "Performance isn't the reason." },
        ],
        correctOptionId: "c",
        explanation: "factor(arm) invents levels from whatever is present, typos included. Explicit levels make the order deliberate and surface bad values.",
      },
    ],
    challengeId: "data-lab.boss",
    check: { validatorId: "lesson-check:data-lab.lesson-3" },
    availability: available,
  },
];
