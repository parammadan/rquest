"use client";

import { ArrowLeft, ArrowRight, BookOpen, Check, CircleCheck, CircleX, Clapperboard, Clock, ListChecks, Sparkles, Target } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { catalog } from "@/content/catalog";
import { getVideo } from "@/content/videos";
import { gradeKnowledgeCheck, type Answers } from "@/domain/knowledge-check";
import type { Lesson } from "@/domain/types";
import { LockedMissionScreen } from "@/features/missions/mission-detail";
import { useProgress, useRecordValidatedCompletion } from "@/features/progress/progress-provider";
import { accentStyle, WorldEmblem } from "@/features/worlds/world-visuals";
import { cn } from "@/lib/cn";
import { issueLessonReceipt } from "./issue-lesson-receipt";
import { LessonBlocks, Walkthrough } from "./lesson-parts";
import { VideoPlayer, VideoUnavailable } from "./video-player";

type Stage = "brief" | "watch" | "learn" | "check";
const STAGES: { id: Stage; label: string; icon: typeof BookOpen }[] = [
  { id: "brief", label: "Briefing", icon: Target },
  { id: "watch", label: "Watch", icon: Clapperboard },
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "check", label: "Check", icon: ListChecks },
];

export function LessonGate({ missionId, lessonId }: { missionId: string; lessonId: string }) {
  const { ready, progress } = useProgress();
  const mission = catalog.getMission(missionId)!;
  const lesson = catalog.getItem(lessonId) as Lesson;
  if (!ready) {
    return (
      <div aria-busy="true" aria-label="Loading lesson">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-6 h-80 w-full rounded-[1.25rem]" />
      </div>
    );
  }
  if (progress.missions[mission.id].status === "locked") return <LockedMissionScreen mission={mission} progress={progress} />;
  if (lesson.availability.status !== "available") return <PlannedLesson lesson={lesson} />;
  return <LessonExperience lesson={lesson} completed={progress.completedItemIds.has(lesson.id)} />;
}

function BackToMission({ lesson }: { lesson: Lesson }) {
  const m = catalog.getMission(lesson.missionId)!;
  return (
    <Link href={`/academy/missions/${m.id}`} className="mb-5 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {m.worldLabel}: {m.title}
    </Link>
  );
}

function PlannedLesson({ lesson }: { lesson: Lesson }) {
  const challenge = catalog.getItem(lesson.challengeId)!;
  return (
    <div style={accentStyle(catalog.getMission(lesson.missionId)!)}>
      <BackToMission lesson={lesson} />
      <h1 className="font-display text-3xl font-semibold tracking-tight">{lesson.title}</h1>
      <p className="mt-2 max-w-2xl text-fg-muted">{lesson.summary}</p>
      <div className="mt-6 max-w-3xl">
        <VideoUnavailable video={getVideo(lesson.videoId)} reason="planned" />
      </div>
      <p className="mt-6 max-w-2xl text-sm text-fg-muted">
        This world’s video and lesson are in production. Its challenges are fully playable now. Lessons add bonus XP and
        count toward mastery, but you don’t need them to clear the world.
      </p>
      <ButtonLink href={`/academy/missions/${lesson.missionId}/challenges/${challenge.id}`} className="mt-5">
        Go to the challenge: {challenge.title} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </ButtonLink>
    </div>
  );
}

function LessonExperience({ lesson, completed }: { lesson: Lesson; completed: boolean }) {
  const mission = catalog.getMission(lesson.missionId)!;
  const challenge = catalog.getItem(lesson.challengeId)!;
  const video = getVideo(lesson.videoId);
  const [stage, setStage] = useState<Stage>("brief");
  const idx = STAGES.findIndex((s) => s.id === stage);
  const go = (s: Stage) => {
    setStage(s);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <article style={accentStyle(mission)} aria-labelledby="lesson-title">
      <BackToMission lesson={lesson} />
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-[var(--accent)]!">Lesson · {mission.worldLabel}</p>
          <h1 id="lesson-title" className="mt-1 font-display text-3xl font-semibold tracking-tight">
            {lesson.title}
          </h1>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-sm",
            completed ? "border-emerald/35 bg-emerald/10 text-emerald" : "border-line-strong text-fg-muted",
          )}
        >
          {completed ? <CircleCheck className="h-4 w-4" aria-hidden="true" /> : <ListChecks className="h-4 w-4" aria-hidden="true" />}
          {completed ? "Lesson completed" : "Complete the check to finish"}
        </span>
      </header>

      <nav aria-label="Lesson steps" className="mb-8">
        <ol className="grid grid-cols-4 gap-2">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const current = s.id === stage;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => go(s.id)}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex w-full flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs transition sm:flex-row sm:justify-center sm:text-sm",
                    current
                      ? "border-[color-mix(in_oklab,var(--accent)_55%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-fg"
                      : i < idx
                        ? "border-line text-fg-muted"
                        : "border-line text-fg-subtle hover:text-fg",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {stage === "brief" && <Briefing lesson={lesson} onBegin={() => go("watch")} />}
          {stage === "watch" && (
            <section aria-label="Video">
              {video ? <VideoPlayer video={video} focusChapterIds={lesson.chapterIds} /> : <VideoUnavailable video={video} reason="planned" />}
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="panel p-5">
                  <h2 className="eyebrow mb-3">Key points</h2>
                  <ul className="space-y-2 text-sm text-fg-muted">
                    {lesson.keyPoints.map((k) => (
                      <li key={k} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                        {k}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs text-fg-subtle">
                    Watching is optional for completion. The transcript and the Learn step cover the same material.
                  </p>
                </div>
                <Button onClick={() => go("learn")}>
                  Continue to Learn <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </section>
          )}
          {stage === "learn" && (
            <section aria-label="Learn" className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div>
                <LessonBlocks blocks={lesson.explanation} />
              </div>
              <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
                {lesson.walkthrough && <Walkthrough walkthrough={lesson.walkthrough} />}
                <Button onClick={() => go("check")} className="w-full">
                  Take the knowledge check <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </section>
          )}
          {stage === "check" && <KnowledgeCheck lesson={lesson} alreadyCompleted={completed} challengeHref={`/academy/missions/${mission.id}/challenges/${challenge.id}`} challengeTitle={challenge.title} />}
        </motion.div>
      </AnimatePresence>
    </article>
  );
}

function Briefing({ lesson, onBegin }: { lesson: Lesson; onBegin: () => void }) {
  const mission = catalog.getMission(lesson.missionId)!;
  const challenge = catalog.getItem(lesson.challengeId)!;
  return (
    <section aria-label="Mission briefing" className="panel-raised relative overflow-hidden p-6 sm:p-10">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "var(--accent)" }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.18, scale: 1 }}
        transition={{ duration: 1.2 }}
      />
      <div className="relative flex flex-col gap-8 md:flex-row">
        <motion.div initial={{ scale: 0.6, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 180, damping: 14 }}>
          <WorldEmblem mission={mission} className="h-24 w-24" />
        </motion.div>
        <div className="flex-1">
          <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            Mission briefing
          </motion.p>
          <motion.p
            className="mt-2 max-w-2xl font-display text-xl leading-relaxed sm:text-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {lesson.briefing}
          </motion.p>
          <h2 className="eyebrow mt-8 mb-3">Objectives</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {lesson.objectives.map((o, i) => (
              <motion.li
                key={o}
                className="flex gap-2.5 rounded-xl bg-white/[0.03] p-3 text-sm ring-1 ring-inset ring-line"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                {o}
              </motion.li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-fg-subtle" aria-hidden="true" />~{lesson.estimatedMinutes} min
            </span>
            <span className="font-medium text-[var(--accent)]">{lesson.xp} XP for a correct check</span>
            <span>Prepares you for: {challenge.title}</span>
          </div>
          <Button onClick={onBegin} size="lg" className="mt-8">
            Begin lesson <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function KnowledgeCheck({
  lesson,
  alreadyCompleted,
  challengeHref,
  challengeTitle,
}: {
  lesson: Lesson;
  alreadyCompleted: boolean;
  challengeHref: string;
  challengeTitle: string;
}) {
  const record = useRecordValidatedCompletion();
  const { progress } = useProgress();
  const [answers, setAnswers] = useState<Answers>({});
  const [outcome, setOutcome] = useState<null | { kind: "awarded" | "already"; newAchievements: string[] }>(null);
  const [submitting, setSubmitting] = useState(false);
  const grade = gradeKnowledgeCheck(lesson, answers);

  const choose = (qid: string, optionId: string) => {
    const q = grade.results.find((r) => r.id === qid);
    if (q?.correct || outcome) return; // correct answers lock in
    setAnswers((a) => ({ ...a, [qid]: optionId }));
  };

  const finish = async () => {
    setSubmitting(true);
    const before = new Set(progress.achievements.filter((a) => a.unlocked).map((a) => a.achievement.id));
    const receipt = await issueLessonReceipt(lesson, answers);
    if (receipt) {
      const r = record(lesson.id, receipt);
      if (r.ok) {
        // Read the re-derived achievements on the next render via the outcome state.
        setOutcome({ kind: "awarded", newAchievements: [...before] });
      } else {
        setOutcome({ kind: "already", newAchievements: [] });
      }
    }
    setSubmitting(false);
  };

  const unlockedNow =
    outcome?.kind === "awarded"
      ? progress.achievements.filter((a) => a.unlocked && !outcome.newAchievements.includes(a.achievement.id)).map((a) => a.achievement.title)
      : [];

  if (outcome) {
    return <Completion lesson={lesson} awarded={outcome.kind === "awarded"} achievements={unlockedNow} challengeHref={challengeHref} challengeTitle={challengeTitle} />;
  }

  return (
    <section aria-labelledby="check-h" className="mx-auto max-w-3xl">
      <h2 id="check-h" className="font-display text-2xl font-semibold">Knowledge check</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Answer all {lesson.knowledgeCheck.length} correctly to complete the lesson. You get instant feedback and can retry.
        {alreadyCompleted && " You've already completed this lesson, so reviewing it won't award XP again."}
      </p>
      <ol className="mt-6 space-y-5">
        {lesson.knowledgeCheck.map((q, qi) => {
          const res = grade.results[qi];
          const picked = answers[q.id];
          return (
            <li key={q.id} className="panel p-5">
              <fieldset>
                <legend className="font-medium">
                  <span className="mr-2 font-mono text-xs text-fg-subtle">Q{qi + 1}</span>
                  {q.prompt}
                </legend>
                {q.code && (
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-[#060910] px-4 py-3 font-mono text-sm text-fg">{q.code}</pre>
                )}
                <div className="mt-4 grid gap-2" role="radiogroup" aria-label={`Question ${qi + 1} options`}>
                  {q.options.map((o) => {
                    const isPicked = picked === o.id;
                    const isRight = isPicked && res.correct;
                    const isWrong = isPicked && !res.correct;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={isPicked}
                        disabled={res.correct && !isPicked}
                        onClick={() => choose(q.id, o.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition disabled:opacity-50",
                          isRight && "border-emerald/50 bg-emerald/10 text-fg",
                          isWrong && "border-coral/50 bg-coral/10 text-fg",
                          !isPicked && "border-line hover:border-line-strong hover:bg-white/[0.02]",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs",
                            isRight ? "border-emerald bg-emerald text-ink-950" : isWrong ? "border-coral text-coral" : "border-line-strong text-fg-subtle",
                          )}
                          aria-hidden="true"
                        >
                          {isRight ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : o.id.toUpperCase()}
                        </span>
                        <span className={o.label.match(/[()"$[]/) ? "font-mono" : undefined}>{o.label}</span>
                      </button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {picked && (
                    <motion.p
                      key={picked}
                      role="status"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("mt-3 flex gap-2 text-sm", res.correct ? "text-emerald" : "text-coral")}
                    >
                      {res.correct ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <CircleX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                      <span>
                        <span className="font-medium">{res.correct ? "Correct. " : "Not quite. "}</span>
                        <span className="text-fg-muted">
                          {res.correct
                            ? q.explanation
                            : `${q.options.find((o) => o.id === picked)?.feedback ?? ""} Try another option.`.trim()}
                        </span>
                      </span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </fieldset>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted" aria-live="polite">
          {grade.correctCount} of {lesson.knowledgeCheck.length} correct
        </p>
        <Button onClick={finish} disabled={!grade.allCorrect || submitting}>
          <Sparkles className="h-4 w-4" aria-hidden="true" /> Complete lesson
        </Button>
      </div>
    </section>
  );
}

function Completion({
  lesson,
  awarded,
  achievements,
  challengeHref,
  challengeTitle,
}: {
  lesson: Lesson;
  awarded: boolean;
  achievements: string[];
  challengeHref: string;
  challengeTitle: string;
}) {
  return (
    <section aria-labelledby="done-h" role="status" className="panel-raised relative mx-auto max-w-2xl overflow-hidden p-8 text-center sm:p-12">
      {Array.from({ length: 14 }, (_, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="absolute left-1/2 top-24 h-2 w-2 rounded-full"
          style={{ background: ["#a78bfa", "#22d3ee", "#34d399", "#fbbf24"][i % 4] }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos((i / 14) * Math.PI * 2) * 160, y: Math.sin((i / 14) * Math.PI * 2) * 110, opacity: 0, scale: 0.4 }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
        />
      ))}
      <motion.div
        className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald text-ink-950"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 12 }}
      >
        <Check className="h-10 w-10" strokeWidth={3} aria-hidden="true" />
      </motion.div>
      <h2 id="done-h" className="mt-6 font-display text-3xl font-semibold">Lesson complete</h2>
      <p className="mt-2 text-fg-muted">{lesson.title}</p>
      {lesson.reward && (
        <motion.div
          className="mx-auto mt-5 max-w-md rounded-xl border border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] px-4 py-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="font-display font-semibold text-[var(--accent)]">{lesson.reward.title}</p>
          <p className="mt-0.5 text-sm text-fg-muted">{lesson.reward.detail}</p>
        </motion.div>
      )}
      <motion.p
        className="mt-5 font-display text-2xl font-semibold text-emerald"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {awarded ? `+${lesson.xp} XP` : "Already completed: no additional XP"}
      </motion.p>
      {achievements.length > 0 && <p className="mt-2 text-sm text-gold">Achievement unlocked: {achievements.join(", ")}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <ButtonLink href={challengeHref} size="lg">
          Continue to the challenge: {challengeTitle} <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </ButtonLink>
        <ButtonLink href={`/academy/missions/${lesson.missionId}`} variant="secondary" size="lg">
          Back to mission
        </ButtonLink>
      </div>
    </section>
  );
}
