"use client";

import { ArrowRight, Award, BookOpen, Check, Lock, Map as MapIcon, SquareTerminal, Swords } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { CompletionRing } from "@/components/ui/completion-ring";
import { Hydrated, PhaseChip, ProgressBar, SectionHeading, StatusChip } from "@/components/ui/primitives";
import { catalog } from "@/content/catalog";
import { AchievementBadge } from "@/features/achievements/achievement-badge";
import { useProgress } from "@/features/progress/progress-provider";
import { LevelIndicator, XPProgressBar } from "@/features/shell/learner-widgets";
import { accentStyle, WorldEmblem } from "@/features/worlds/world-visuals";
import { cn } from "@/lib/cn";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";

export function DashboardScreen() {
  const { ready, progress } = useProgress();
  const active = progress.activeMissionId ? catalog.getMission(progress.activeMissionId)! : null;
  const activeProgress = active ? progress.missions[active.id] : null;
  const openItems = active?.items.filter((i) => !progress.completedItemIds.has(i.id)) ?? [];
  const nextItem = openItems.find((i) => i.availability.status === "available") ?? openItems[0] ?? null;
  const hasActivity = progress.itemsCompleted > 0;

  const recent = progress.achievements
    .filter((a) => a.unlocked)
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))
    .slice(0, 3);
  const nextAchievement = progress.achievements.find((a) => !a.unlocked);

  return (
    <div className="space-y-8">
      {/* Welcome / learner status */}
      <section aria-labelledby="welcome" className="panel-raised relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-30 [mask-image:linear-gradient(90deg,transparent,black)]" />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="eyebrow mb-2">Academy dashboard</p>
            <h1 id="welcome" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {hasActivity ? "Welcome back" : "Welcome to the academy"}, <span className="text-gradient">Demo Learner</span>
            </h1>
            <p className="mt-3 max-w-xl text-fg-muted">
              {hasActivity
                ? "Your progress is saved in this browser. Pick up where you left off."
                : "Your journey starts in The Data Lab. Every XP point you earn here will come from validated work — nothing is awarded for clicking around."}
            </p>
            <div className="mt-6 flex items-center gap-4">
              <LevelIndicator level={progress.level.level} size="lg" />
              <div className="min-w-0 flex-1 max-w-sm">
                <p className="text-sm text-fg-muted">
                  Level {progress.level.level} · <span className="font-medium text-fg">{progress.level.title}</span>
                </p>
                <div className="mt-2">
                  <XPProgressBar level={progress.level} ready={ready} />
                </div>
                {progress.level.xpNeededForNext !== null && (
                  <p className="mt-1.5 text-xs text-fg-subtle">
                    <Hydrated ready={ready}>{formatNumber(progress.level.xpNeededForNext)}</Hydrated> XP to{" "}
                    {progress.level.nextLevelTitle}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5 md:flex-col md:gap-2">
            <CompletionRing value={progress.academyCompletion} ready={ready} label="Academy completion" caption="Complete" size={132} />
            <p className="text-sm text-fg-muted md:text-center">
              <span className="font-mono text-fg">
                {progress.itemsCompleted}/{progress.itemsTotal}
              </span>{" "}
              items validated
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Active mission */}
        {active && activeProgress ? (
          <section aria-labelledby="active-mission" className="panel relative overflow-hidden p-6" style={accentStyle(active)}>
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-15 blur-3xl" style={{ background: "var(--accent)" }} />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow">Active mission</p>
                <StatusChip status={activeProgress.status} />
              </div>
              <div className="mt-4 flex items-center gap-4">
                <WorldEmblem mission={active} className="h-16 w-16 shrink-0 animate-float" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-[var(--accent)]">
                    {active.worldLabel} · {active.subtitle}
                  </p>
                  <h2 id="active-mission" className="font-display text-2xl font-semibold tracking-tight">
                    {active.title}
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-fg-muted">{active.tagline}</p>
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-xs text-fg-muted">
                  <span>Mission progress</span>
                  <span className="font-mono">{formatPercent(activeProgress.fraction)}</span>
                </div>
                <ProgressBar value={activeProgress.fraction} tone="accent" label={`${active.title} progress`} />
              </div>
              {nextItem && (
                <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-inset ring-line">
                  {nextItem.kind === "lesson" ? (
                    <BookOpen className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
                  ) : (
                    <SquareTerminal className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
                  )}
                  <span className="text-sm">
                    <span className="text-fg-subtle">Up next: </span>
                    {nextItem.kind === "challenge" && nextItem.availability.status === "available" ? (
                      <Link
                        href={`/academy/missions/${active.id}/challenges/${nextItem.id}`}
                        className="font-medium text-fg underline decoration-[var(--accent)] underline-offset-4 hover:text-[var(--accent)]"
                      >
                        {nextItem.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{nextItem.title}</span>
                    )}
                  </span>
                  {nextItem.availability.status === "planned" && (
                    <PhaseChip phase={nextItem.availability.phase} className="ml-auto" />
                  )}
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <ButtonLink href={`/academy/missions/${active.id}`}>
                  {activeProgress.status === "in-progress" ? "Continue learning" : "Start learning"}
                  <ArrowRight className="h-4 w-4 transition group-hover/btn:translate-x-0.5" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/academy/map" variant="secondary">
                  <MapIcon className="h-4 w-4" aria-hidden="true" /> Mission map
                </ButtonLink>
              </div>
            </div>
          </section>
        ) : (
          <section className="panel p-6">
            <p className="eyebrow">Academy</p>
            <h2 className="mt-1 font-display text-xl font-semibold">
              {progress.completedMissionCount === progress.missionCount ? "Every world mastered" : "Every world cleared"}
            </h2>
            <p className="mt-2 text-sm text-fg-muted">
              {progress.completedMissionCount === progress.missionCount
                ? "Every lesson and challenge is validated. Revisit any world from the mission map."
                : "Every challenge and boss is validated. Complete each world\u2019s lessons to master it."}
            </p>
            <ButtonLink href="/academy/map" className="mt-4">Open mission map</ButtonLink>
          </section>
        )}

        {/* Stat tiles */}
        <section aria-label="Progress summary" className="grid grid-cols-2 gap-4 self-start">
          {[
            { label: "Total XP", value: formatNumber(progress.totalXp), icon: Award },
            { label: "Worlds cleared", value: `${progress.clearedMissionCount}/${progress.missionCount}`, icon: MapIcon },
            { label: "Lessons", value: `${progress.lessonsCompleted}/${progress.lessonsTotal}`, icon: BookOpen },
            { label: "Challenges", value: `${progress.challengesCompleted}/${progress.challengesTotal}`, icon: Swords },
          ].map((s) => (
            <div key={s.label} className="panel p-4">
              <s.icon className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
              <p className="mt-3 font-display text-2xl font-semibold">
                <Hydrated ready={ready}>{s.value}</Hydrated>
              </p>
              <p className="text-xs text-fg-muted">{s.label}</p>
            </div>
          ))}
          <Link
            href="/academy/progress"
            className="col-span-2 flex items-center justify-between rounded-xl px-1 text-sm text-fg-muted transition hover:text-fg"
          >
            Full progress overview <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>

      {/* Mission progression preview */}
      <section aria-labelledby="journey">
        <SectionHeading
          id="journey"
          eyebrow="Your route"
          title="Mission progression"
          action={
            <Link href="/academy/map" className="inline-flex items-center gap-1.5 text-sm text-cyan hover:underline">
              Open map <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
        <ol className="panel relative grid gap-3 p-5 sm:grid-cols-5 sm:gap-2">
          <span aria-hidden="true" className="absolute left-[10%] right-[10%] top-[3.1rem] hidden h-px bg-[linear-gradient(90deg,#22d3ee55,#a78bfa55,#fb718555,#34d39955,#fbbf2455)] sm:block" />
          {catalog.missions.map((m) => {
            const mp = progress.missions[m.id];
            const locked = mp.status === "locked";
            return (
              <li key={m.id} className="relative" style={accentStyle(m)}>
                <Link
                  href={`/academy/missions/${m.id}`}
                  className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/[0.03] sm:flex-col sm:text-center"
                >
                  <span className="relative">
                    <WorldEmblem mission={m} className={cn("h-12 w-12 transition group-hover:scale-105", locked && "opacity-35 grayscale")} />
                    <span className={cn(
                      "absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-ink-850",
                      mp.status === "completed" ? "bg-emerald text-ink-950" : mp.status === "cleared" ? "bg-gold text-ink-950" : locked ? "bg-ink-600 text-fg-muted" : "bg-[var(--accent)] text-ink-950",
                    )} aria-hidden="true">
                      {mp.cleared ? <Check className="h-3 w-3" strokeWidth={3} /> : locked ? <Lock className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-ink-950" />}
                    </span>
                  </span>
                  <span>
                    <span className="block font-mono text-[0.62rem] uppercase tracking-wider text-fg-subtle">{m.worldLabel}</span>
                    <span className={cn("block text-sm font-medium", locked ? "text-fg-muted" : "text-fg")}>{m.title}</span>
                    <span className="block text-xs text-fg-subtle">
                      {mp.status === "locked" ? "Locked" : mp.status === "completed" ? "Mastered" : mp.status === "cleared" ? `Cleared · ${formatPercent(mp.fraction)}` : formatPercent(mp.fraction)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Recent achievements */}
      <section aria-labelledby="recent-achievements">
        <SectionHeading
          id="recent-achievements"
          eyebrow="Trophy case"
          title="Recent achievements"
          action={
            <Link href="/academy/achievements" className="inline-flex items-center gap-1.5 text-sm text-cyan hover:underline">
              All achievements <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
        {recent.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-3">
            {recent.map((a) => (
              <li key={a.achievement.id} className="panel flex items-center gap-4 p-4">
                <AchievementBadge achievement={a.achievement} unlocked size="sm" />
                <div>
                  <p className="font-medium">{a.achievement.title}</p>
                  <p className="text-xs text-fg-muted">Unlocked {a.unlockedAt ? formatDate(a.unlockedAt) : ""}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="panel flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
            {nextAchievement && <AchievementBadge achievement={nextAchievement.achievement} unlocked={false} size="md" />}
            <div className="flex-1">
              <p className="font-display text-lg font-semibold">No achievements yet</p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-fg-muted">
                {nextAchievement ? (
                  <>
                    Your first, <span className="text-fg">{nextAchievement.achievement.title}</span>, unlocks when you{" "}
                    {nextAchievement.achievement.criterionLabel.charAt(0).toLowerCase() + nextAchievement.achievement.criterionLabel.slice(1)}{" "}
                    Validate a World 1 challenge to earn it.
                  </>
                ) : null}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
