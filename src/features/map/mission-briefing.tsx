"use client";

import { ArrowRight, Award, Clock, Lock, Swords } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { forwardRef } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { DifficultyMeter, ProgressBar, StatusChip } from "@/components/ui/primitives";
import { catalog } from "@/content/catalog";
import type { MissionProgress } from "@/domain/progression";
import type { Mission } from "@/domain/types";
import { summarizeMission } from "@/features/missions/mission-summary";
import { accentStyle, WorldEmblem } from "@/features/worlds/world-visuals";
import { formatNumber, formatPercent } from "@/lib/format";

export const MissionBriefing = forwardRef<
  HTMLElement,
  {
    mission: Mission;
    progress: MissionProgress;
    onExplainLock: () => void;
  }
>(function MissionBriefing({ mission, progress, onExplainLock }, ref) {
  const summary = summarizeMission(mission);
  const reward = catalog.getAchievement(mission.rewardAchievementId);
  const locked = progress.status === "locked";
  const prereq = mission.requires.map((id) => catalog.getMission(id)!);

  return (
    <section
      ref={ref}
      aria-labelledby="briefing-title"
      className="panel-raised relative overflow-hidden p-6 scroll-mt-24"
      style={accentStyle(mission)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--accent)" }}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mission.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="relative"
        >
          <div className="flex items-start gap-4">
            <WorldEmblem mission={mission} className={`h-14 w-14 shrink-0 ${locked ? "opacity-40 grayscale" : ""}`} />
            <div className="min-w-0">
              <p className="eyebrow text-[var(--accent)]!">
                {mission.worldLabel} · {mission.subtitle}
              </p>
              <h2 id="briefing-title" className="mt-1 font-display text-2xl font-semibold tracking-tight">
                {mission.title}
              </h2>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusChip status={progress.status} />
          </div>

          <p className="mt-4 text-sm leading-relaxed text-fg-muted">{mission.tagline}</p>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-line">
              <dt className="eyebrow mb-1.5">Difficulty</dt>
              <dd>
                <DifficultyMeter level={mission.difficulty} />
              </dd>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-line">
              <dt className="eyebrow mb-1.5">Duration</dt>
              <dd className="flex items-center gap-1.5 text-fg">
                <Clock className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />~{mission.estimatedHours} h
              </dd>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-line">
              <dt className="eyebrow mb-1.5">XP reward</dt>
              <dd className="font-display text-lg font-semibold text-[var(--accent)]">
                {formatNumber(summary.totalXp)} XP
              </dd>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-line">
              <dt className="eyebrow mb-1.5">Contents</dt>
              <dd className="text-fg">
                {summary.lessons} lessons · {summary.challenges} challenges
                <span className="flex items-center gap-1 text-xs text-fg-muted">
                  <Swords className="h-3 w-3" aria-hidden="true" /> {summary.bosses} boss mission{summary.bosses === 1 ? "" : "s"}
                </span>
              </dd>
            </div>
          </dl>

          {reward && (
            <p className="mt-4 flex items-center gap-2 text-xs text-fg-muted">
              <Award className="h-4 w-4 text-gold" aria-hidden="true" />
              Unlocks the <span className="font-medium text-fg">{reward.title}</span> achievement
            </p>
          )}

          {!locked && (
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs text-fg-muted">
                <span>Mission progress</span>
                <span className="font-mono">
                  {progress.itemsCompleted}/{progress.itemsTotal} · {formatPercent(progress.fraction)}
                </span>
              </div>
              <ProgressBar value={progress.fraction} tone="accent" label={`${mission.title} progress`} />
            </div>
          )}

          {locked && prereq.length > 0 && (
            <p className="mt-5 flex items-start gap-2 rounded-xl border border-line-strong bg-ink-900/60 p-3 text-sm text-fg-muted">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
              <span>
                Clear <span className="font-medium text-fg">{prereq.map((p) => p.title).join(", ")}</span> to unlock.
              </span>
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {locked ? (
              <Button variant="secondary" onClick={onExplainLock}>
                <Lock className="h-4 w-4" aria-hidden="true" /> Why is this locked?
              </Button>
            ) : (
              <ButtonLink href={`/academy/missions/${mission.id}`}>
                {progress.status === "completed" ? "Review mission" : progress.status === "in-progress" || progress.status === "cleared" ? "Continue mission" : "Enter mission"}
                <ArrowRight className="h-4 w-4 transition group-hover/btn:translate-x-0.5" aria-hidden="true" />
              </ButtonLink>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
});
