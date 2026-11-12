/**
 * Learning insights, derived only from recorded challenge.attempted events.
 *
 * Definitions (shown to learners in the UI):
 * - attempted: distinct challenges with at least one recorded attempt.
 * - solved: distinct challenges with a recorded passing attempt.
 * - first-try: of the challenges attempted, how many passed on attempt 1.
 * - earlier completions: challenges completed before attempt tracking began (a completion
 *   with no recorded attempts). They count for XP but carry no attempt-level evidence.
 * - failure counts: each failed check in each failed attempt counts once.
 * - needs practice: a skill whose checks failed in 2+ attempts, or that is failing on a
 *   challenge not yet solved. Recommendations point at the lesson that prepares that challenge.
 */
import type { Catalog } from "../../content/catalog.ts";
import { getSkill, skillFor, type SkillId } from "../../content/skills.ts";
import { validatorForChallenge } from "../../content/validators/index.ts";
import type { AttemptOutcome, ChallengeAttemptedEvent, Lesson, ProgressSnapshot } from "../../domain/types.ts";

export interface FailedCheckStat {
  challengeId: string;
  challengeTitle: string;
  checkId: string;
  description: string;
  skill: SkillId | null;
  count: number;
}

export interface SkillStat {
  skill: SkillId;
  label: string;
  failures: number;
  /** Failed attempts that included at least one check in this skill. */
  attemptsAffected: number;
  /** Challenges where this skill's checks failed and no passing attempt or completion exists yet. */
  unresolvedChallengeIds: string[];
}

export interface PracticeRecommendation {
  skill: SkillId;
  label: string;
  reason: string;
  challengeId: string;
  challengeTitle: string;
  missionId: string;
  lessonId: string | null;
  lessonTitle: string | null;
}

export interface LearningInsights {
  attempts: number;
  challengesAttempted: number;
  challengesSolved: number;
  firstTry: { passed: number; of: number };
  /** Completed challenges with no attempt evidence (recorded before attempt tracking). */
  earlierCompletions: number;
  outcomes: Record<AttemptOutcome, number>;
  activeMs: number;
  topFailedChecks: FailedCheckStat[];
  skills: SkillStat[];
  practice: PracticeRecommendation[];
}

const OUTCOMES: AttemptOutcome[] = ["passed", "failed", "syntax-error", "runtime-error", "timeout", "integrity"];

export function deriveInsights(snapshot: ProgressSnapshot, catalog: Catalog): LearningInsights {
  const attempts = snapshot.events.filter(
    (e): e is ChallengeAttemptedEvent => e.type === "challenge.attempted" && catalog.getItem(e.itemId)?.kind === "challenge",
  );
  const completed = new Set(
    snapshot.events.filter((e) => e.type === "item.completed" && e.itemKind === "challenge").map((e) => e.itemId),
  );
  const byChallenge = new Map<string, ChallengeAttemptedEvent[]>();
  for (const a of attempts) byChallenge.set(a.itemId, [...(byChallenge.get(a.itemId) ?? []), a]);

  const solved = new Set(attempts.filter((a) => a.outcome === "passed").map((a) => a.itemId));
  const resolved = (id: string) => solved.has(id) || completed.has(id);
  const firstTryPassed = [...byChallenge.values()].filter((list) => list.find((a) => a.attempt === 1)?.outcome === "passed").length;

  const outcomes = Object.fromEntries(OUTCOMES.map((o) => [o, 0])) as Record<AttemptOutcome, number>;
  for (const a of attempts) outcomes[a.outcome] += 1;

  // Failed checks and the skills they exercise.
  const checkCounts = new Map<string, FailedCheckStat>();
  const skillStats = new Map<SkillId, { failures: number; attempts: number; challenges: Set<string> }>();
  for (const a of attempts) {
    if (a.outcome !== "failed") continue;
    const def = validatorForChallenge(a.itemId);
    const title = catalog.getItem(a.itemId)?.title ?? a.itemId;
    const skillsInAttempt = new Set<SkillId>();
    for (const checkId of a.failedCheckIds) {
      const skill = skillFor(a.itemId, checkId) ?? null;
      const key = `${a.itemId}:${checkId}`;
      const prev = checkCounts.get(key);
      checkCounts.set(key, {
        challengeId: a.itemId,
        challengeTitle: title,
        checkId,
        description: def?.checks.find((c) => c.id === checkId)?.description ?? checkId,
        skill,
        count: (prev?.count ?? 0) + 1,
      });
      if (!skill) continue;
      const s = skillStats.get(skill) ?? { failures: 0, attempts: 0, challenges: new Set<string>() };
      s.failures += 1;
      s.challenges.add(a.itemId);
      skillStats.set(skill, s);
      skillsInAttempt.add(skill);
    }
    for (const skill of skillsInAttempt) skillStats.get(skill)!.attempts += 1;
  }

  const skills: SkillStat[] = [...skillStats.entries()]
    .map(([skill, s]) => ({
      skill,
      label: getSkill(skill).label,
      failures: s.failures,
      attemptsAffected: s.attempts,
      unresolvedChallengeIds: [...s.challenges].filter((id) => !resolved(id)),
    }))
    .sort((a, b) => b.failures - a.failures || a.label.localeCompare(b.label));

  const lessonFor = (challengeId: string) =>
    catalog.missions.flatMap((m) => m.items).find((i): i is Lesson => i.kind === "lesson" && i.challengeId === challengeId) ?? null;

  const practice: PracticeRecommendation[] = skills
    .filter((s) => s.attemptsAffected >= 2 || s.unresolvedChallengeIds.length > 0)
    .sort((a, b) => b.unresolvedChallengeIds.length - a.unresolvedChallengeIds.length || b.failures - a.failures)
    .slice(0, 3)
    .map((s) => {
      // Point at the challenge where this skill failed most, preferring one not yet solved.
      const candidates = [...checkCounts.values()].filter((c) => c.skill === s.skill);
      candidates.sort(
        (a, b) =>
          Number(s.unresolvedChallengeIds.includes(b.challengeId)) - Number(s.unresolvedChallengeIds.includes(a.challengeId)) ||
          b.count - a.count,
      );
      const target = candidates[0];
      const lesson = lessonFor(target.challengeId);
      const item = catalog.getItem(target.challengeId)!;
      return {
        skill: s.skill,
        label: s.label,
        reason: s.unresolvedChallengeIds.length
          ? `Failing on ${s.unresolvedChallengeIds.length === 1 ? "a challenge" : `${s.unresolvedChallengeIds.length} challenges`} you haven't solved yet`
          : `Failed in ${s.attemptsAffected} attempts`,
        challengeId: target.challengeId,
        challengeTitle: target.challengeTitle,
        missionId: item.missionId,
        lessonId: lesson?.id ?? null,
        lessonTitle: lesson?.title ?? null,
      };
    });

  return {
    attempts: attempts.length,
    challengesAttempted: byChallenge.size,
    challengesSolved: solved.size,
    firstTry: { passed: firstTryPassed, of: byChallenge.size },
    earlierCompletions: [...completed].filter((id) => !byChallenge.has(id)).length,
    outcomes,
    activeMs: attempts.reduce((n, a) => n + a.activeMs, 0),
    topFailedChecks: [...checkCounts.values()].sort((a, b) => b.count - a.count || a.challengeId.localeCompare(b.challengeId)).slice(0, 5),
    skills,
    practice,
  };
}
