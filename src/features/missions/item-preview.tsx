"use client";

import { ArrowRight, CircleCheck, Clapperboard, Play, ShieldCheck, SquareTerminal, Swords } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ComingSoonPanel } from "@/components/coming-soon-panel";
import { DifficultyMeter } from "@/components/ui/primitives";
import type { Challenge, Lesson, MissionItem } from "@/domain/types";
import { formatMinutes } from "@/lib/format";
import { RCode } from "./r-code";

const STRATEGY_LABEL: Record<Challenge["evaluation"]["strategy"], string> = {
  "output-match": "output comparison against a reference solution",
  "testthat-suite": "a hidden testthat suite",
  "package-checks":
    "package checks — roxygen2 builds NAMESPACE and Rd files, then exports, documentation, examples, and imports are verified",
  "reproducibility-diff":
    "re-runs under different session settings (RNG kind, options, working directory, attached packages), compared exactly",
  "mutation-testing": "running your tests against the real function and against deliberately broken copies of it",
};

function VideoLessonPlaceholder({ lesson }: { lesson: Lesson }) {
  return (
    <ComingSoonPanel
      phase={3}
      icon={Clapperboard}
      title="Video lesson"
      frame={
        <div className="relative aspect-video border-b border-line bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_70%),#060910]">
          <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-40" />
          <div className="absolute inset-0 grid place-items-center">
            <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-fg-subtle">
              <Play className="ml-1 h-6 w-6" />
            </span>
          </div>
          <div className="absolute inset-x-4 bottom-3 flex items-center justify-between text-xs text-fg-muted">
            <span className="truncate font-medium text-fg">{lesson.video.title}</span>
            <span className="font-mono">~{formatMinutes(Math.round(lesson.video.plannedDurationSec / 60))}</span>
          </div>
        </div>
      }
    >
      <p>{lesson.summary}</p>
      <p className="mt-3 font-medium text-fg">This lesson will cover</p>
      <ol className="mt-2 list-inside list-decimal space-y-1">
        {lesson.video.outline.map((o) => (
          <li key={o}>{o}</li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-fg-subtle">
        Instructional videos are produced in Phase 3. Completing a lesson will require a short comprehension check, so
        watching alone never awards XP.
      </p>
    </ComingSoonPanel>
  );
}

function LiveChallenge({ challenge, completed }: { challenge: Challenge; completed: boolean }) {
  const boss = challenge.type === "boss";
  const Icon = boss ? Swords : SquareTerminal;
  return (
    <section className="panel relative overflow-hidden" aria-label={`${challenge.title} (available)`}>
      <div className="relative overflow-hidden border-b border-line bg-[linear-gradient(135deg,color-mix(in_oklab,var(--accent)_22%,#0c111d),#0c111d_65%)] p-5">
        <Icon aria-hidden="true" className="absolute -right-4 -top-4 h-28 w-28 text-white/[0.05]" />
        <p className="eyebrow text-[var(--accent)]!">{boss ? "Boss mission · final challenge" : "Coding challenge"}</p>
        <p className="mt-1 font-display text-xl font-semibold text-fg">{challenge.title.replace(/^Boss:\s*/, "")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-fg-muted">
          <DifficultyMeter level={challenge.difficulty} />
          <span>~{formatMinutes(challenge.estimatedMinutes)}</span>
          <span className="font-medium text-[var(--accent)]">{challenge.xp} XP</span>
          {completed && (
            <span className="inline-flex items-center gap-1 text-emerald">
              <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> Validated
            </span>
          )}
        </div>
      </div>
      <div className="p-5 text-sm leading-relaxed text-fg-muted">
        <p>{challenge.summary}</p>
        <p className="mt-3 flex items-start gap-2 text-xs text-fg-subtle">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
          Runs real R in your browser (webR). Checked by {STRATEGY_LABEL[challenge.evaluation.strategy]}, including inputs
          you haven’t seen. XP is awarded once, only when every check passes.
        </p>
        <ButtonLink href={`/academy/missions/${challenge.missionId}/challenges/${challenge.id}`} className="mt-5">
          {completed ? "Open again" : "Open challenge"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
      </div>
    </section>
  );
}

function ChallengePlaceholder({ challenge }: { challenge: Challenge }) {
  const boss = challenge.type === "boss";
  return (
    <ComingSoonPanel
      phase={2}
      icon={boss ? Swords : SquareTerminal}
      title={boss ? "Boss mission" : "Coding challenge"}
      frame={
        boss ? (
          <div className="relative overflow-hidden border-b border-line bg-[linear-gradient(135deg,color-mix(in_oklab,var(--accent)_25%,#0c111d),#0c111d_60%)] p-5">
            <Swords aria-hidden="true" className="absolute -right-4 -top-4 h-32 w-32 text-white/[0.05]" />
            <p className="eyebrow text-[var(--accent)]!">Final challenge of this world</p>
            <p className="mt-1 font-display text-xl font-semibold text-fg">{challenge.title.replace(/^Boss:\s*/, "")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-fg-muted">
              <DifficultyMeter level={challenge.difficulty} />
              <span>~{formatMinutes(challenge.estimatedMinutes)}</span>
              <span className="font-medium text-[var(--accent)]">{challenge.xp} XP</span>
            </div>
          </div>
        ) : undefined
      }
    >
      <p>{challenge.summary}</p>
      <div className="mt-4">
        <RCode code={challenge.starterCode} filename={`${challenge.id.split(".").pop()}.R`} />
      </div>
      <p className="mt-4 text-xs leading-relaxed text-fg-subtle">
        In-browser R is live, but this challenge’s validator isn’t written yet. It will be checked by {STRATEGY_LABEL[challenge.evaluation.strategy]}{" "}
        Until then nothing here can be run or submitted, and it awards no XP.
      </p>
    </ComingSoonPanel>
  );
}

export function ItemPreview({ item, completed }: { item: MissionItem; completed: boolean }) {
  if (item.kind === "lesson") return <VideoLessonPlaceholder lesson={item} />;
  if (item.availability.status === "available") return <LiveChallenge challenge={item} completed={completed} />;
  return <ChallengePlaceholder challenge={item} />;
}
