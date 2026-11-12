import type { EvaluationResult } from "@/domain/evaluation";
import type { Challenge, ValidationReceipt } from "@/domain/types";
import { validatorForChallenge } from "@/content/validators";
import { rSession } from "./r-session";

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The trust boundary between execution and progress: a receipt is issued
 * only when the webR evaluation passed every check of the challenge's own
 * validator. Its digest binds the receipt to the exact code that passed.
 */
export async function evaluateChallenge(
  challenge: Challenge,
  code: string,
): Promise<{ result: EvaluationResult; receipt: ValidationReceipt | null }> {
  const def = validatorForChallenge(challenge.id);
  if (!def || def.validatorId !== challenge.evaluation.validatorId) {
    return { result: { status: "runtime-error", message: "This challenge has no validator yet." }, receipt: null };
  }
  const result = await rSession.validate(code, def, challenge.packages);
  if (result.status !== "passed") return { result, receipt: null };
  const checkedAt = new Date().toISOString();
  const evidenceDigest = await sha256(
    [def.validatorId, checkedAt, code, ...result.checks.map((c) => `${c.id}:${c.passed}`)].join("\n"),
  );
  return { result, receipt: { validatorId: def.validatorId, verdict: "passed", checkedAt, evidenceDigest } };
}

export function runChallengeCode(challenge: Challenge, code: string) {
  const def = validatorForChallenge(challenge.id);
  return rSession.run(code, {
    setup: def?.setup ?? "",
    packages: challenge.packages,
    timeoutMs: def?.timeoutMs ?? 10_000,
  });
}
