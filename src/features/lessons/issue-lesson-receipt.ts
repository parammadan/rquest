import { gradeKnowledgeCheck, type Answers } from "@/domain/knowledge-check";
import type { Lesson, ValidationReceipt } from "@/domain/types";
import { sha256 } from "@/lib/sha256";

/**
 * The only way a lesson completion receipt is produced: the knowledge check
 * must be fully correct. Opening, scrolling, or watching never completes a lesson.
 */
export async function issueLessonReceipt(lesson: Lesson, answers: Answers): Promise<ValidationReceipt | null> {
  if (lesson.availability.status !== "available") return null;
  const { allCorrect } = gradeKnowledgeCheck(lesson, answers);
  if (!allCorrect) return null;
  const checkedAt = new Date().toISOString();
  const evidenceDigest = await sha256(
    [lesson.check.validatorId, checkedAt, ...lesson.knowledgeCheck.map((q) => `${q.id}:${answers[q.id]}`)].join("\n"),
  );
  return { validatorId: lesson.check.validatorId, verdict: "passed", checkedAt, evidenceDigest };
}
