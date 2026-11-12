/**
 * Challenge evaluation contracts (Phase 2).
 *
 * A validator is data: R setup code plus R check expressions. The runtime
 * executes them against the learner's code; only an all-pass result can be
 * turned into a ValidationReceipt.
 */

export interface ValidationCheck {
  id: string;
  /** Shown to the learner before and after submission. */
  description: string;
  /** Shown when this check fails. */
  hint: string;
  /** R expression evaluated after the learner's code; must return TRUE. */
  expr: string;
}

export interface ValidatorDefinition {
  validatorId: string;
  challengeId: string;
  /** R code run before the learner's code (synthetic data, files). */
  setup: string;
  checks: ValidationCheck[];
  /** Wall-clock budget for one evaluation, excluding package installs. */
  timeoutMs: number;
}

export interface CheckOutcome {
  id: string;
  description: string;
  hint: string;
  passed: boolean;
}

export type EvaluationResult =
  | { status: "passed"; checks: CheckOutcome[] }
  | { status: "failed"; checks: CheckOutcome[] }
  /** The learner's code could not be parsed ("syntax") or stopped with an error ("runtime"). */
  | { status: "error"; kind: "syntax" | "runtime"; message: string; checks: CheckOutcome[] }
  | { status: "timeout"; message: string }
  /** The learner's code changed base R itself; grading was refused and R restarts. */
  | { status: "integrity"; message: string }
  /** R itself was unavailable or misbehaved (not evidence about the learner's code). */
  | { status: "runtime-error"; message: string };

/** Map the grader's raw verdicts onto check definitions. */
export function interpretVerdicts(def: ValidatorDefinition, raw: string[]): EvaluationResult {
  const failedAll = () => def.checks.map((c) => ({ ...c, passed: false }));
  if (raw[0] === "SYNTAX") {
    return { status: "error", kind: "syntax", message: `Your code has a syntax error: ${raw[1] ?? ""}`.trim(), checks: failedAll() };
  }
  if (raw[0] === "ERROR") {
    return { status: "error", kind: "runtime", message: `Your code stopped with an error: ${raw[1] ?? ""}`.trim(), checks: failedAll() };
  }
  if (raw[0] === "TAMPER") {
    return {
      status: "integrity",
      message: `Your code changed base R itself (${raw[1] ?? "unknown"}), so it can't be graded. R has been restarted; remove that code and submit again.`,
    };
  }
  if (raw.length !== def.checks.length || raw.some((v) => v !== "PASS" && v !== "FAIL")) {
    return { status: "runtime-error", message: "The validator returned an unexpected result." };
  }
  const checks = def.checks.map((c, i) => ({
    id: c.id,
    description: c.description,
    hint: c.hint,
    passed: raw[i] === "PASS",
  }));
  return { status: checks.every((c) => c.passed) ? "passed" : "failed", checks };
}
