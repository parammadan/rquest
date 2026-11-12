"use client";

import { Award, BookOpen, Database, RotateCcw, ScrollText, SquareTerminal, Swords } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CompletionRing } from "@/components/ui/completion-ring";
import { Dialog } from "@/components/ui/dialog";
import { Hydrated, ProgressBar, SectionHeading, StatusChip } from "@/components/ui/primitives";
import { catalog } from "@/content/catalog";
import { useProgress, useProgressActions } from "@/features/progress/progress-provider";
import { LevelIndicator, XPProgressBar } from "@/features/shell/learner-widgets";
import { PageHeader } from "@/features/shell/page-header";
import { accentStyle, WorldEmblem } from "@/features/worlds/world-visuals";
import { cn } from "@/lib/cn";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";

export function ProgressScreen() {
  const { ready, progress } = useProgress();
  const { resetLearnerProgress } = useProgressActions();
  const [confirmReset, setConfirmReset] = useState(false);
  const isScenario = progress.origin === "dev-scenario";

  const stats = [
    { label: "Total XP", value: formatNumber(progress.totalXp), icon: Award },
    { label: "Lessons completed", value: `${progress.lessonsCompleted} / ${progress.lessonsTotal}`, icon: BookOpen },
    { label: "Challenges completed", value: `${progress.challengesCompleted} / ${progress.challengesTotal}`, icon: SquareTerminal },
    { label: "Boss missions defeated", value: `${progress.bossesDefeated} / ${progress.missionCount}`, icon: Swords },
    { label: "Achievements", value: `${progress.unlockedAchievementCount} / ${progress.achievements.length}`, icon: Award },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Learner progress"
        title="Progress overview"
        description="Every number on this page is derived from one event log of validated completions. Nothing is estimated or simulated."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section aria-labelledby="level-h" className="panel-raised flex flex-col gap-6 p-6 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
          <div className="flex items-center gap-4">
            <LevelIndicator level={progress.level.level} size="lg" />
            <div>
              <p className="eyebrow">Current level</p>
              <h2 id="level-h" className="font-display text-xl font-semibold">
                Level {progress.level.level} · {progress.level.title}
              </h2>
            </div>
          </div>
          <div className="flex-1">
            <XPProgressBar level={progress.level} ready={ready} />
          </div>
          <div className="flex items-center gap-4 border-t border-line pt-5">
            <CompletionRing value={progress.academyCompletion} ready={ready} label="Overall academy completion" size={96} />
            <div className="text-sm">
              <p className="font-medium">Overall completion</p>
              <p className="text-fg-muted">
                {progress.itemsCompleted} of {progress.itemsTotal} items · {progress.clearedMissionCount} of{" "}
                {progress.missionCount} worlds cleared
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Totals" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="panel p-4">
              <s.icon className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
              <p className="mt-3 font-display text-2xl font-semibold">
                <Hydrated ready={ready}>{s.value}</Hydrated>
              </p>
              <p className="text-xs text-fg-muted">{s.label}</p>
            </div>
          ))}
        </section>
      </div>

      <section aria-labelledby="mastery" className="mt-10">
        <SectionHeading id="mastery" eyebrow="By world" title="Mission mastery" />
        <ul className="space-y-3">
          {catalog.missions.map((m) => {
            const mp = progress.missions[m.id];
            return (
              <li key={m.id} style={accentStyle(m)}>
                <Link
                  href={`/academy/missions/${m.id}`}
                  className="panel grid gap-4 p-4 transition hover:border-line-strong sm:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,2fr)_auto] sm:items-center"
                >
                  <WorldEmblem mission={m} className={cn("h-11 w-11", mp.status === "locked" && "opacity-35 grayscale")} />
                  <span>
                    <span className="block font-mono text-[0.62rem] uppercase tracking-wider text-fg-subtle">{m.worldLabel}</span>
                    <span className="block font-medium">{m.title}</span>
                  </span>
                  <span className="space-y-1.5">
                    <ProgressBar value={mp.fraction} tone="accent" size="sm" label={`${m.title} mastery`} />
                    <span className="flex flex-wrap gap-x-4 font-mono text-[0.68rem] text-fg-subtle">
                      <span>Lessons {mp.lessonsCompleted}/{mp.lessonsTotal}</span>
                      <span>Challenges {mp.challengesCompleted}/{mp.challengesTotal}</span>
                      <span>Boss {mp.bossDefeated ? "defeated" : "—"}</span>
                      <span>{mp.xpEarned}/{mp.xpAvailable} XP</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3 sm:justify-end">
                    <span className="font-mono text-sm">{formatPercent(mp.fraction)}</span>
                    <StatusChip status={mp.status} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="ledger" className="mt-10">
        <SectionHeading id="ledger" eyebrow="Audit trail" title="XP ledger" />
        {progress.xpLedger.length === 0 ? (
          <div className="panel flex items-center gap-4 p-6">
            <ScrollText className="h-8 w-8 shrink-0 text-fg-subtle" aria-hidden="true" />
            <div>
              <p className="font-medium">No XP awarded yet</p>
              <p className="mt-1 text-sm text-fg-muted">
                Each validated lesson or challenge appears here with the XP it awarded. Solve a World 1 challenge to
                earn your first entry.
              </p>
            </div>
          </div>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <caption className="sr-only">XP awarded per validated item</caption>
              <thead className="border-b border-line text-xs text-fg-subtle">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Item</th>
                  <th scope="col" className="px-4 py-3 font-medium">World</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">XP</th>
                </tr>
              </thead>
              <tbody>
                {[...progress.xpLedger].reverse().map((x) => (
                  <tr key={x.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-fg-muted">{formatDate(x.awardedAt)}</td>
                    <td className="px-4 py-2.5">{x.itemTitle}</td>
                    <td className="px-4 py-2.5 text-fg-muted">{catalog.getMission(x.missionId)?.title}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald">+{x.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="storage" className="mt-10">
        <SectionHeading id="storage" eyebrow="Your data" title="Storage" />
        <div className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Database className="h-6 w-6 shrink-0 text-fg-subtle" aria-hidden="true" />
          <p className="flex-1 text-sm text-fg-muted">
            Progress is stored only in this browser (local storage). There is no account and nothing is sent to a
            server.
            {isScenario && " A developer scenario is active; resetting affects only your real progress."}
          </p>
          <Button variant="secondary" size="sm" onClick={() => setConfirmReset(true)} disabled={!ready}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset progress
          </Button>
        </div>
      </section>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset learner progress?"
        description="This permanently clears the completion events stored in this browser. Content is not affected."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              resetLearnerProgress();
              setConfirmReset(false);
            }}
          >
            Reset progress
          </Button>
        </div>
      </Dialog>
    </>
  );
}
