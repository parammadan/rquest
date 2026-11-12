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
  | { status: "error"; message: string; checks: CheckOutcome[] }
  | { status: "timeout"; message: string }
  | { status: "runtime-error"; message: string };

/** Map the harness' raw per-check verdicts onto check definitions. */
export function interpretVerdicts(def: ValidatorDefinition, raw: string[]): EvaluationResult {
  if (raw[0] === "ERROR") {
    return {
      status: "error",
      message: raw[1] ?? "Your code raised an error.",
      checks: def.checks.map((c) => ({ ...c, passed: false })),
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
