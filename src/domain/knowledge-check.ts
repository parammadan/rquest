import type { Lesson } from "./types.ts";

export type Answers = Record<string, string | undefined>;

export interface QuestionResult {
  id: string;
  answered: boolean;
  correct: boolean;
  explanation: string;
}

/** Grade a lesson's knowledge check. Completion rule: every question correct. */
export function gradeKnowledgeCheck(lesson: Lesson, answers: Answers) {
  const results: QuestionResult[] = lesson.knowledgeCheck.map((q) => {
    const a = answers[q.id];
    return { id: q.id, answered: a !== undefined, correct: a === q.correctOptionId, explanation: q.explanation };
  });
  return {
    results,
    allCorrect: results.length > 0 && results.every((r) => r.correct),
    correctCount: results.filter((r) => r.correct).length,
  };
}
