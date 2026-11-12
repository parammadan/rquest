/**
 * One graded submission against the R grader (see harness.ts).
 *
 * Self-contained on purpose (no imports, no module state): the validator self-test
 * runs this exact function inside the browser via `gradeSubmission.toString()`, so the
 * test and the app exercise the same orchestration.
 *
 * Phase 1 runs the learner's code; phase 2 evaluates each check in its own call, with a
 * fresh evaluation environment that holds only JavaScript-side handles. Returns the raw
 * verdicts understood by interpretVerdicts(): one "PASS"/"FAIL" per check, or
 * ["SYNTAX" | "ERROR" | "TAMPER", message].
 */

interface GradeRObj {
  toJs(): Promise<unknown>;
  get(name: string): Promise<GradeRObj>;
}
interface GradeShelter {
  evalR(code: string, opts?: Record<string, unknown>): Promise<GradeRObj>;
  REnvironment: new (values: Record<string, unknown>) => Promise<GradeRObj>;
  purge(): Promise<void>;
}
export interface GradeWebR {
  Shelter: new () => Promise<GradeShelter>;
}

export async function gradeSubmission(
  webR: GradeWebR,
  grader: unknown,
  code: string,
  setup: string,
  checks: string[],
): Promise<string[]> {
  const first = async (o: GradeRObj) => {
    const js = (await o.toJs()) as { values?: unknown[] };
    return String(js.values?.[0] ?? "");
  };
  const shelter = await new webR.Shelter();
  try {
    const learnEnv = await new shelter.REnvironment({ ".g": grader, ".code": code, ".setup": setup });
    const learned = await shelter.evalR(".g$learn(.code, .setup)", { env: learnEnv });
    const status = await first(await learned.get("status"));
    const message = await first(await learned.get("message"));
    if (status === "syntax") return ["SYNTAX", message];
    if (status === "error") return ["ERROR", message];
    if (status === "tamper") return ["TAMPER", message];
    if (status !== "ok") return ["UNEXPECTED", status];
    const state = await learned.get("state");
    const verdicts: string[] = [];
    for (const expr of checks) {
      const checkEnv = await new shelter.REnvironment({ ".g": grader, ".s": state, ".e": expr });
      const verdict = await first(await shelter.evalR(".g$check(.s, .e)", { env: checkEnv }));
      if (verdict === "TAMPER") return ["TAMPER", "a check"];
      verdicts.push(verdict);
    }
    return verdicts;
  } finally {
    await shelter.purge();
  }
}
