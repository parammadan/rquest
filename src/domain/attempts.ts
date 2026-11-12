/**
 * Challenge attempts: learning evidence recorded for every real graded submission.
 *
 * Rules
 * - One attempt per call to the grader that evaluated the learner's code. Opening a
 *   challenge, running code with "Run", or clicking around records nothing.
 * - R failing to start (or a package failing to install) is not an attempt: the learner's
 *   code was never evaluated. A timeout or an integrity refusal is: the code ran.
 * - failedCheckIds lists checks that were evaluated and failed. Code that errors before
 *   the checks run records an error outcome with no failed checks.
 * - Attempts never award XP; completions (with receipts) still do, once.
 */
import type { Catalog } from "../content/catalog.ts";
import type { EvaluationResult } from "./evaluation.ts";
import type { AttemptOutcome, ChallengeAttemptedEvent, ProgressSnapshot } from "./types.ts";

/** Active time is capped per attempt so a forgotten open tab can't dominate. */
export const MAX_ACTIVE_MS = 4 * 60 * 60 * 1000;

export interface AttemptEvidence {
  outcome: AttemptOutcome;
  failedCheckIds: string[];
}

/** What a grading result says about the learner's code, or null if nothing was evaluated. */
export function evidenceFromEvaluation(result: EvaluationResult): AttemptEvidence | null {
  switch (result.status) {
    case "passed":
      return { outcome: "passed", failedCheckIds: [] };
    case "failed":
      return { outcome: "failed", failedCheckIds: result.checks.filter((c) => !c.passed).map((c) => c.id) };
    case "error":
      return { outcome: result.kind === "syntax" ? "syntax-error" : "runtime-error", failedCheckIds: [] };
    case "timeout":
      return { outcome: "timeout", failedCheckIds: [] };
    case "integrity":
      return { outcome: "integrity", failedCheckIds: [] };
    case "runtime-error":
      return null;
  }
}

export interface AttemptInput extends AttemptEvidence {
  challengeId: string;
  activeMs: number;
  /** The challenge's validator check ids; failed ids outside this set are dropped. */
  checkIds: readonly string[];
  now?: () => Date;
  newId?: () => string;
}

export type AttemptResult =
  | { ok: true; event: ChallengeAttemptedEvent }
  | { ok: false; reason: "unknown-item" | "not-a-challenge" | "item-not-available" };

export function attemptsFor(snapshot: ProgressSnapshot, challengeId: string): ChallengeAttemptedEvent[] {
  return snapshot.events.filter((e): e is ChallengeAttemptedEvent => e.type === "challenge.attempted" && e.itemId === challengeId);
}

export function buildAttempt(snapshot: ProgressSnapshot, catalog: Catalog, input: AttemptInput): AttemptResult {
  const item = catalog.getItem(input.challengeId);
  if (!item) return { ok: false, reason: "unknown-item" };
  if (item.kind !== "challenge") return { ok: false, reason: "not-a-challenge" };
  if (item.availability.status !== "available") return { ok: false, reason: "item-not-available" };
  const known = new Set(input.checkIds);
  const failed = input.outcome === "failed" ? [...new Set(input.failedCheckIds)].filter((id) => known.has(id)) : [];
  const activeMs = Math.round(Math.min(MAX_ACTIVE_MS, Math.max(0, Number.isFinite(input.activeMs) ? input.activeMs : 0)));
  const now = (input.now ?? (() => new Date()))();
  return {
    ok: true,
    event: {
      id: (input.newId ?? defaultId)(),
      type: "challenge.attempted",
      itemId: item.id,
      missionId: item.missionId,
      occurredAt: now.toISOString(),
      attempt: attemptsFor(snapshot, item.id).length + 1,
      outcome: input.outcome,
      failedCheckIds: failed,
      activeMs,
    },
  };
}

function defaultId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `att-${Date.now()}-${Math.random()}`;
}
