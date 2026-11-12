"use client";

import { ArrowLeft, ArrowRight, Award, Clock, Lock, Target } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { DifficultyMeter, ProgressBar, Skeleton, StatusChip } from "@/components/ui/primitives";
import { catalog } from "@/content/catalog";
import type { DerivedProgress } from "@/domain/progression";
import type { Mission, MissionId } from "@/domain/types";
import { AchievementBadge } from "@/features/achievements/achievement-badge";
import { useProgress } from "@/features/progress/progress-provider";
import { accentStyle, WorldEmblem, worldVisual } from "@/features/worlds/world-visuals";
import { formatMinutes, formatNumber, formatPercent } from "@/lib/format";
import { PackageAssembly } from "@/features/lessons/diagrams";
import { ItemPreview } from "./item-preview";
import { LessonTimeline } from "./lesson-timeline";
import { LockedMissionExplanation } from "./locked-mission-dialog";
import { summarizeMission } from "./mission-summary";

function BackLink() {
  return (
    <Link href="/academy/map" className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-muted transition hover:text-fg">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mission map
    </Link>
  );
}

/** Route guard: locked worlds cannot be entered, even by direct URL. */
export function MissionDetailGate({ missionId }: { missionId: MissionId }) {
  const { ready, progress } = useProgress();
  const mission = catalog.getMission(missionId)!;

  if (!ready) {
    return (
      <div aria-busy="true" aria-label="Loading mission">
        <BackLink />
        <Skeleton className="h-56 w-full rounded-[1.25rem]" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-[1.25rem]" />
          <Skeleton className="h-72 w-full rounded-[1.25rem]" />
        </div>
      </div>
    );
  }
  if (progress.missions[missionId].status === "locked") {
    return <LockedMissionScreen mission={mission} progress={progress} />;
  }
  return <MissionDetail mission={mission} progress={progress} />;
}

export function LockedMissionScreen({ mission, progress }: { mission: Mission; progress: DerivedProgress }) {
  const first = catalog.getMission(progress.missions[mission.id].unmetPrerequisites[0]);
  const firstReachable = first && progress.missions[first.id].status !== "locked";
  return (
    <div style={accentStyle(mission)}>
      <BackLink />
      <section aria-labelledby="locked-title" className="panel-raised mx-auto max-w-2xl p-6 text-center sm:p-10">
        <div className="relative mx-auto mb-6 h-24 w-24">
          <WorldEmblem mission={mission} className="h-24 w-24 opacity-30 grayscale" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-ink-800">
              <Lock className="h-5 w-5 text-fg-muted" aria-hidden="true" />
            </span>
          </span>
        </div>
        <p className="eyebrow">
          {mission.worldLabel} · {mission.subtitle}
        </p>
        <h1 id="locked-title" className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {mission.title} is locked
        </h1>
        <p className="mx-auto mt-3 max-w-md text-fg-muted">
          Clear {first ? `${first.worldLabel}: ${first.title}` : "the previous world"} to unlock this mission.
        </p>
        <div className="mt-8 text-left">
          <LockedMissionExplanation mission={mission} progress={progress} />
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/academy/map" variant="secondary">
            Back to map
          </ButtonLink>
          {first && firstReachable && <ButtonLink href={`/academy/missions/${first.id}`}>Go to {first.title}</ButtonLink>}
        </div>
      </section>
    </div>
  );
}

function MissionDetail({ mission, progress }: { mission: Mission; progress: DerivedProgress }) {
  const mp = progress.missions[mission.id];
  const summary = summarizeMission(mission);
  const reward = catalog.getAchievement(mission.rewardAchievementId);
  const rewardUnlocked = progress.achievements.find((a) => a.achievement.id === reward?.id)?.unlocked ?? false;
  const open = mission.items.filter((i) => !progress.completedItemIds.has(i.id));
  const firstOpen = open.find((i) => i.availability.status === "available") ?? open[0] ?? mission.items[0];
  const [selectedId, setSelectedId] = useState(firstOpen.id);
  const selected = mission.items.find((i) => i.id === selectedId) ?? firstOpen;
  const previewRef = useRef<HTMLDivElement>(null);
  const v = worldVisual(mission);

  const idx = catalog.missions.findIndex((m) => m.id === mission.id);
  const prev = catalog.missions[idx - 1];
  const next = catalog.missions[idx + 1];

  const onSelect = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      previewRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  };

  return (
    <article style={accentStyle(mission)} aria-labelledby="mission-title">
      <BackLink />

      {/* Hero */}
      <header
        className="panel-raised relative overflow-hidden p-6 sm:p-8"
        style={{
          background: `radial-gradient(90% 120% at 100% 0%, color-mix(in oklab, ${v.accent} 22%, transparent), transparent 60%), radial-gradient(60% 80% at 0% 100%, color-mix(in oklab, ${v.accent2} 25%, transparent), transparent 60%), #111827`,
        }}
      >
        <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-25" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <WorldEmblem mission={mission} className="h-24 w-24 shrink-0 animate-float sm:h-28 sm:w-28" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-[var(--accent)]!">
              {mission.worldLabel} · {mission.subtitle}
            </p>
            <h1 id="mission-title" className="mt-1.5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {mission.title}
            </h1>
            <p className="mt-2 max-w-2xl text-fg-muted">{mission.tagline}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <StatusChip status={mp.status} />
              <DifficultyMeter level={mission.difficulty} />
              <span className="inline-flex items-center gap-1.5 text-fg-muted">
                <Clock className="h-4 w-4 text-fg-subtle" aria-hidden="true" /> ~{mission.estimatedHours} h ·{" "}
                {formatMinutes(summary.totalMinutes)} of content
              </span>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl bg-ink-950/50 p-4 ring-1 ring-inset ring-line md:w-56">
            <p className="eyebrow">Reward</p>
            <p className="mt-1 font-display text-3xl font-semibold text-[var(--accent)]">{formatNumber(summary.totalXp)} XP</p>
            <p className="text-xs text-fg-muted">
              Earned <span className="font-mono">{mp.xpEarned}/{mp.xpAvailable}</span>
            </p>
            <div className="mt-3 space-y-2.5">
              <div>
                <div className="mb-1 flex justify-between text-xs text-fg-muted">
                  <span>Cleared · challenges</span>
                  <span className="font-mono">
                    {mp.challengesCompleted}/{mp.challengesTotal}
                  </span>
                </div>
                <ProgressBar
                  value={mp.challengesTotal ? mp.challengesCompleted / mp.challengesTotal : 0}
                  tone="accent"
                  size="sm"
                  label={`${mission.title} challenges validated`}
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-fg-muted">
                  <span>Mastered · incl. lessons</span>
                  <span className="font-mono">
                    {mp.itemsCompleted}/{mp.itemsTotal}
                  </span>
                </div>
                <ProgressBar value={mp.fraction} size="sm" label={`${mission.title} mastery`} valueText={formatPercent(mp.fraction)} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-8">
          <section aria-labelledby="story">
            <h2 id="story" className="eyebrow mb-3">
              Mission briefing
            </h2>
            <div className="space-y-3 text-[0.95rem] leading-relaxed text-fg-muted">
              {mission.story.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>

          {mission.assembly && (
            <PackageAssembly
              title={mission.assembly.title}
              caption={mission.assembly.caption}
              parts={mission.assembly.parts}
              completed={progress.completedItemIds}
            />
          )}

          <section aria-labelledby="objectives">
            <h2 id="objectives" className="eyebrow mb-3">
              Objectives
            </h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {mission.objectives.map((o) => (
                <li key={o} className="flex gap-2.5 rounded-xl bg-white/[0.02] p-3 text-sm ring-1 ring-inset ring-line">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                  {o}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="timeline">
            <div className="mb-3 flex items-end justify-between">
              <h2 id="timeline" className="eyebrow">
                Lessons &amp; challenges
              </h2>
              <span className="font-mono text-xs text-fg-subtle">
                {summary.lessons} lessons · {summary.challenges} challenges · {summary.bosses} boss
              </span>
            </div>
            <LessonTimeline
              items={mission.items}
              completed={progress.completedItemIds}
              selectedId={selected.id}
              onSelect={onSelect}
            />
          </section>
        </div>

        <div ref={previewRef} className="scroll-mt-24 space-y-6 lg:sticky lg:top-8 lg:self-start">
          <p className="eyebrow" aria-live="polite">
            Preview · {selected.title}
          </p>
          <ItemPreview item={selected} completed={progress.completedItemIds.has(selected.id)} />
          {reward && (
            <section aria-label="Mission reward" className="panel flex items-center gap-4 p-4">
              <AchievementBadge achievement={reward} unlocked={rewardUnlocked} size="sm" />
              <div className="text-sm">
                <p className="flex items-center gap-1.5 font-medium">
                  <Award className="h-4 w-4 text-gold" aria-hidden="true" /> {reward.title}
                </p>
                <p className="text-fg-muted">
                  {rewardUnlocked ? "Unlocked." : `Awarded when every challenge and the boss in ${mission.title} are validated.`}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      <nav aria-label="Adjacent worlds" className="mt-12 grid grid-cols-1 gap-3 border-t border-line pt-6 sm:grid-cols-2">
        {prev ? (
          <Link href={`/academy/missions/${prev.id}`} className="panel group flex items-center gap-3 p-4 transition hover:border-line-strong">
            <ArrowLeft className="h-4 w-4 text-fg-subtle transition group-hover:-translate-x-0.5" aria-hidden="true" />
            <span>
              <span className="block text-xs text-fg-subtle">Previous · {prev.worldLabel}</span>
              <span className="font-medium">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/academy/missions/${next.id}`}
            className="panel group flex items-center justify-end gap-3 p-4 text-right transition hover:border-line-strong"
          >
            <span>
              <span className="block text-xs text-fg-subtle">
                Next · {next.worldLabel}
                {progress.missions[next.id].status === "locked" ? " · Locked" : ""}
              </span>
              <span className="font-medium">{next.title}</span>
            </span>
            {progress.missions[next.id].status === "locked" ? (
              <Lock className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
            ) : (
              <ArrowRight className="h-4 w-4 text-fg-subtle transition group-hover:translate-x-0.5" aria-hidden="true" />
            )}
          </Link>
        )}
      </nav>
    </article>
  );
}
