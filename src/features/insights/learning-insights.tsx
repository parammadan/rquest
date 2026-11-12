"use client";

import { ArrowRight, BookOpen, Crosshair, History, ListChecks, Target, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Hydrated, ProgressBar, SectionHeading } from "@/components/ui/primitives";
import { catalog } from "@/content/catalog";
import type { ProgressSnapshot } from "@/domain/types";
import { formatPercent } from "@/lib/format";
import { deriveInsights } from "./derive-insights";

const minutes = (ms: number) => {
  const m = Math.round(ms / 60_000);
  return m < 1 ? "under a minute" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Your Learning Insights": patterns in the learner's own graded attempts. */
export function LearningInsights({ snapshot, ready }: { snapshot: ProgressSnapshot; ready: boolean }) {
  const i = useMemo(() => deriveInsights(snapshot, catalog), [snapshot]);
  const earlier =
    i.earlierCompletions > 0 ? (
      <p className="mt-3 flex items-start gap-2 text-xs text-fg-subtle" data-testid="earlier-completions">
        <History className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {plural(i.earlierCompletions, "challenge")} {i.earlierCompletions === 1 ? "was" : "were"} completed before attempt
        tracking began. {i.earlierCompletions === 1 ? "It counts" : "They count"} for XP and unlocks, but there is no
        attempt history to analyse.
      </p>
    ) : null;

  return (
    <section aria-labelledby="insights-h" className="mt-10" data-testid="learning-insights">
      <SectionHeading id="insights-h" eyebrow="From your graded submissions" title="Your Learning Insights" />
      {!ready ? (
        <div className="panel h-28 animate-pulse" aria-busy="true" />
      ) : i.attempts === 0 ? (
        <div className="panel flex items-start gap-4 p-6" data-testid="insights-empty">
          <Target className="mt-0.5 h-8 w-8 shrink-0 text-fg-subtle" aria-hidden="true" />
          <div>
            <p className="font-medium">No graded attempts yet</p>
            <p className="mt-1 text-sm text-fg-muted">
              Each time you submit a challenge for validation, RQuest records which checks passed or failed, but never
              your code. Patterns in your attempts, and the lessons worth revisiting, appear here after your first
              submission.
            </p>
            {earlier}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Challenges attempted", value: `${i.challengesAttempted} / ${catalog.missions.flatMap((m) => m.items).filter((x) => x.kind === "challenge").length}` },
              { label: "Challenges solved", value: String(i.challengesSolved) },
              { label: "Solved on the first try", value: `${i.firstTry.passed} of ${i.firstTry.of}`, sub: formatPercent(i.firstTry.of ? i.firstTry.passed / i.firstTry.of : 0) },
              { label: "Graded attempts", value: String(i.attempts), sub: `${minutes(i.activeMs)} active` },
            ].map((s) => (
              <div key={s.label} className="panel p-4">
                <p className="font-display text-2xl font-semibold">
                  <Hydrated ready={ready}>{s.value}</Hydrated>
                </p>
                <p className="text-xs text-fg-muted">{s.label}</p>
                {s.sub && <p className="mt-1 font-mono text-[0.68rem] text-fg-subtle">{s.sub}</p>}
              </div>
            ))}
          </div>

          {(i.outcomes["syntax-error"] > 0 || i.outcomes["runtime-error"] > 0 || i.outcomes.timeout > 0 || i.outcomes.integrity > 0) && (
            <p className="flex items-start gap-2 text-sm text-fg-muted" data-testid="insights-errors">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              Submissions that stopped before the checks could run:{" "}
              {[
                i.outcomes["syntax-error"] && plural(i.outcomes["syntax-error"], "syntax error"),
                i.outcomes["runtime-error"] && plural(i.outcomes["runtime-error"], "runtime error"),
                i.outcomes.timeout && plural(i.outcomes.timeout, "timeout"),
                i.outcomes.integrity && plural(i.outcomes.integrity, "refused submission"),
              ]
                .filter(Boolean)
                .join(", ")}
              .
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="panel p-5">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <ListChecks className="h-4 w-4 text-fg-subtle" aria-hidden="true" /> Most frequently failed checks
              </h3>
              {i.topFailedChecks.length === 0 ? (
                <p className="mt-3 text-sm text-fg-muted">No check has failed yet.</p>
              ) : (
                <ol className="mt-3 space-y-3" data-testid="failed-checks">
                  {i.topFailedChecks.map((c) => (
                    <li key={`${c.challengeId}:${c.checkId}`} className="flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0">
                        <span className="block">{c.description}</span>
                        <span className="block text-xs text-fg-subtle">{c.challengeTitle}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs text-coral">×{c.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="panel p-5">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Crosshair className="h-4 w-4 text-fg-subtle" aria-hidden="true" /> Failed checks by skill
              </h3>
              {i.skills.length === 0 ? (
                <p className="mt-3 text-sm text-fg-muted">No check has failed yet.</p>
              ) : (
                <ul className="mt-3 space-y-3" data-testid="skill-failures">
                  {i.skills.map((s) => (
                    <li key={s.skill} className="text-sm">
                      <span className="flex justify-between gap-3">
                        <span>{s.label}</span>
                        <span className="font-mono text-xs text-fg-subtle">
                          {plural(s.failures, "failed check")} · {plural(s.attemptsAffected, "attempt")}
                        </span>
                      </span>
                      <ProgressBar value={s.failures / i.skills[0].failures} tone="accent" size="sm" label={`${s.label} failures`} className="mt-1.5" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Areas needing more practice</h3>
            {i.practice.length === 0 ? (
              <p className="panel p-4 text-sm text-fg-muted" data-testid="practice-none">
                Nothing stands out yet. A skill appears here when its checks fail in two or more attempts, or on a
                challenge you haven&apos;t solved.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-3" data-testid="practice">
                {i.practice.map((p) => (
                  <li key={p.skill} className="panel flex flex-col gap-3 p-4">
                    <span>
                      <span className="block font-medium">{p.label}</span>
                      <span className="block text-xs text-fg-muted">{p.reason}</span>
                    </span>
                    {p.lessonId && (
                      <Link
                        href={`/academy/missions/${p.missionId}/lessons/${p.lessonId}`}
                        className="inline-flex items-center gap-1.5 text-sm text-cyan hover:underline"
                      >
                        <BookOpen className="h-4 w-4" aria-hidden="true" /> Revisit: {p.lessonTitle}
                      </Link>
                    )}
                    <Link
                      href={`/academy/missions/${p.missionId}/challenges/${p.challengeId}`}
                      className="mt-auto inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
                    >
                      Back to {p.challengeTitle} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {earlier}
          <p className="text-xs text-fg-subtle">
            Counts come only from graded submissions in this browser. Each failed check in each failed attempt counts once;
            skills are a label for what a check exercises, not a measure of what you know.
          </p>
        </div>
      )}
    </section>
  );
}
