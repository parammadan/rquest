"use client";

import { ArrowRight, CircleCheck, Clapperboard, Play, ShieldCheck, SquareTerminal, Swords } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ComingSoonPanel } from "@/components/coming-soon-panel";
import { DifficultyMeter } from "@/components/ui/primitives";
import type { Challenge, Lesson, MissionItem } from "@/domain/types";
import { getDebrief, getVideo } from "@/content/videos";
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

function LessonPreview({ lesson, completed }: { lesson: Lesson; completed: boolean }) {
  const live = lesson.availability.status === "available";
  const video = getVideo(lesson.videoId);
  const chapters = video?.chapters.filter((c) => lesson.chapterIds.includes(c.id)) ?? [];
  if (!live) {
    return (
      <ComingSoonPanel phase={3} icon={Clapperboard} title="Video lesson in production">
        <p>{lesson.summary}</p>
        <p className="mt-3 font-medium text-fg">This lesson will cover</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {lesson.objectives.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-fg-subtle">
          The world’s challenges are playable now. Lessons add bonus XP and count toward mastery, but don’t gate the next world.
        </p>
      </ComingSoonPanel>
    );
  }
  return (
    <section className="panel overflow-hidden" aria-label={`${lesson.title} (available)`}>
      <div className="relative aspect-video border-b border-line bg-[#060910]">
        {video?.poster && (
          // eslint-disable-next-line @next/next/no-img-element -- static export, no image optimizer
          <img src={video.poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_40%,rgb(4_6_11/0.9))]" />
        <div className="absolute inset-x-4 bottom-3 flex items-center justify-between text-xs text-fg-muted">
          <span className="font-medium text-fg">{video?.title}</span>
          <span className="inline-flex items-center gap-1">
            <Play className="h-3.5 w-3.5" aria-hidden="true" /> {chapters.length} chapter{chapters.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className="p-5 text-sm leading-relaxed text-fg-muted">
        <p>{lesson.summary}</p>
        <p className="mt-3 text-xs text-fg-subtle">
          Video, written walkthrough, and a {lesson.knowledgeCheck.length}-question knowledge check. Answer every question
          correctly to complete it ({lesson.xp} XP, once).
        </p>
        {completed && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-emerald">
            <CircleCheck className="h-4 w-4" aria-hidden="true" /> Completed
          </p>
        )}
        <div>
          <ButtonLink href={`/academy/missions/${lesson.missionId}/lessons/${lesson.id}`} className="mt-5">
            {completed ? "Review lesson" : "Start lesson"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** Tells learners a debrief video exists before they clear the boss, without showing it. */
function DebriefNote({ challenge, completed }: { challenge: Challenge; completed: boolean }) {
  const d = getDebrief(challenge.missionId);
  if (!d || d.status !== "ready" || !d.durationSec) return null;
  const len = `${Math.floor(d.durationSec / 60)}:${String(Math.round(d.durationSec % 60)).padStart(2, "0")}`;
  return (
    <p data-testid="debrief-note" className="mt-2 flex items-start gap-2 text-xs text-fg-subtle">
      <Clapperboard className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
      {completed
        ? `Debrief video unlocked (${len}): a solution that passes every check, and the mistakes that fail them. Watch it in the challenge.`
        : `Clearing this boss unlocks a debrief video (${len}): a solution that passes every check, and the mistakes that fail them.`}
    </p>
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
        {boss && <DebriefNote challenge={challenge} completed={completed} />}
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
  if (item.kind === "lesson") return <LessonPreview lesson={item} completed={completed} />;
  if (item.availability.status === "available") return <LiveChallenge challenge={item} completed={completed} />;
  return <ChallengePlaceholder challenge={item} />;
}
