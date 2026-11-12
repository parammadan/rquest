/**
 * A small skill taxonomy for learning insights (Milestone 4A).
 *
 * Every validator check maps to exactly one skill. This is a labelling of what each
 * check exercises, used to group recorded failures; it is not a mastery model and makes
 * no claim about what a learner knows. Extend it by adding a skill and re-tagging checks;
 * a unit test fails if any check is untagged or any tag is unknown.
 */
export type SkillId =
  | "functions"
  | "missing-values"
  | "types-and-dates"
  | "data-cleaning"
  | "summaries"
  | "packages"
  | "documentation"
  | "session-independence"
  | "tests-and-validation"
  | "qc-comparison"
  | "reproducibility";

export interface Skill {
  id: SkillId;
  label: string;
  description: string;
}

export const SKILLS: readonly Skill[] = [
  { id: "functions", label: "Writing functions", description: "Signatures, return values, pure functions, and edge inputs." },
  { id: "missing-values", label: "Missing values", description: "Finding, counting, and handling NA deliberately." },
  { id: "types-and-dates", label: "Types and dates", description: "Column types, factors with explicit levels, and date parsing." },
  { id: "data-cleaning", label: "Cleaning messy values", description: "Whitespace, case, duplicates, and regular expressions." },
  { id: "summaries", label: "Summaries and tables", description: "Grouped summaries and computed tables that match a specification." },
  { id: "packages", label: "Package structure", description: "The NAMESPACE, exports, and declared imports." },
  { id: "documentation", label: "Documentation", description: "roxygen2 documentation and examples that run." },
  { id: "session-independence", label: "Session-independent code", description: "No reliance on the working directory, options, attached packages, or global state." },
  { id: "tests-and-validation", label: "Tests and input validation", description: "testthat tests that catch bugs, and inputs that fail loudly and clearly." },
  { id: "qc-comparison", label: "Independent QC", description: "Comparing tables with a tolerance and reporting every discrepancy." },
  { id: "reproducibility", label: "Reproducibility", description: "Seeds and RNG kinds, byte-identical outputs, and provenance." },
];

/** challengeId → checkId → skill. */
export const CHECK_SKILLS: Readonly<Record<string, Readonly<Record<string, SkillId>>>> = {
  "data-lab.challenge-1": { defined: "functions", sample: "data-cleaning", unseen: "data-cleaning", na: "missing-values", empty: "functions" },
  "data-lab.challenge-2": { defined: "functions", columns: "summaries", missing: "missing-values", values: "summaries", unseen: "summaries" },
  "data-lab.boss": {
    defined: "functions",
    rows: "data-cleaning",
    types: "types-and-dates",
    sites: "data-cleaning",
    dates: "types-and-dates",
    values: "missing-values",
    unseen: "data-cleaning",
  },
  "package-factory.challenge-1": {
    builds: "documentation",
    exported: "packages",
    internal: "packages",
    rd: "documentation",
    documented: "documentation",
    works: "data-cleaning",
  },
  "package-factory.challenge-2": {
    builds: "documentation",
    exported: "packages",
    documented: "documentation",
    globals: "packages",
    works: "summaries",
    "na-rm": "missing-values",
  },
  "package-factory.boss": {
    builds: "documentation",
    api: "packages",
    docs: "documentation",
    examples: "documentation",
    globals: "packages",
    "clean-site": "data-cleaning",
    "summarise-arm": "summaries",
  },
  "debugging-crisis.challenge-1": {
    defined: "functions",
    works: "session-independence",
    "no-dplyr": "session-independence",
    unseen: "session-independence",
  },
  "debugging-crisis.challenge-2": {
    signature: "functions",
    "uses-alpha": "functions",
    "ignores-global": "session-independence",
    pure: "functions",
    na: "missing-values",
  },
  "debugging-crisis.boss": {
    defined: "functions",
    table: "summaries",
    wd: "session-independence",
    options: "session-independence",
    attached: "session-independence",
    "no-side-effects": "session-independence",
    provenance: "reproducibility",
  },
  "quality-control.challenge-1": {
    green: "tests-and-validation",
    "n-na": "tests-and-validation",
    "mean-na": "tests-and-validation",
    empty: "tests-and-validation",
    single: "tests-and-validation",
  },
  "quality-control.challenge-2": {
    valid: "tests-and-validation",
    "not-df": "tests-and-validation",
    columns: "tests-and-validation",
    numeric: "tests-and-validation",
    duplicates: "tests-and-validation",
    empty: "tests-and-validation",
  },
  "quality-control.boss": {
    defined: "functions",
    "qc-table": "summaries",
    "qc-unseen": "summaries",
    "finds-bug": "qc-comparison",
    clean: "qc-comparison",
    tolerance: "qc-comparison",
    "unseen-pair": "qc-comparison",
  },
  "research-mission.challenge-1": {
    shape: "functions",
    spec: "reproducibility",
    repeatable: "reproducibility",
    "rng-kind": "reproducibility",
    restores: "session-independence",
    unseen: "reproducibility",
  },
  "research-mission.challenge-2": { shape: "functions", exact: "summaries", unseen: "summaries", options: "session-independence" },
  "research-mission.boss": {
    defined: "functions",
    model: "summaries",
    audit: "reproducibility",
    files: "reproducibility",
    rerun: "reproducibility",
    provenance: "reproducibility",
    "clean-session": "session-independence",
    unseen: "summaries",
  },
};

export const skillFor = (challengeId: string, checkId: string): SkillId | undefined => CHECK_SKILLS[challengeId]?.[checkId];
export const getSkill = (id: SkillId): Skill => SKILLS.find((s) => s.id === id)!;
