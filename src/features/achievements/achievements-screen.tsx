"use client";

import { CircleCheck, Lock } from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Hydrated, ProgressBar } from "@/components/ui/primitives";
import type { AchievementProgress } from "@/domain/progression";
import { useProgress } from "@/features/progress/progress-provider";
import { PageHeader } from "@/features/shell/page-header";
import { cn } from "@/lib/cn";
import { formatDate, formatNumber } from "@/lib/format";
import { AchievementBadge, tierLabel } from "./achievement-badge";

function progressText(a: AchievementProgress) {
  const c = a.achievement.criterion;
  if (c.type === "xp-earned") return `${formatNumber(a.current)} / ${formatNumber(a.target)} XP`;
  if (c.type === "mission-cleared") return `${a.current} / ${a.target} challenges`;
  if (c.type === "bosses-defeated") return `${a.current} / ${a.target} bosses`;
  return `${a.current} / ${a.target}`;
}

export function AchievementsScreen() {
  const { ready, progress } = useProgress();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = progress.achievements.find((a) => a.achievement.id === openId) ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Trophy case"
        title="Achievements"
        description="Every achievement is earned from validated work. Select a badge to see exactly what unlocks it."
      >
        <p className="font-mono text-sm text-fg-muted">
          <Hydrated ready={ready}>{progress.unlockedAchievementCount}</Hydrated>/{progress.achievements.length} unlocked
        </p>
      </PageHeader>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {progress.achievements.map((a) => (
          <li key={a.achievement.id}>
            <button
              type="button"
              onClick={() => setOpenId(a.achievement.id)}
              aria-haspopup="dialog"
              aria-label={`${a.achievement.title}, ${tierLabel(a.achievement.tier)}. ${a.unlocked ? "Unlocked" : "Locked"}. ${a.achievement.criterionLabel} Progress ${progressText(a)}.`}
              className={cn(
                "panel group flex h-full w-full flex-col items-center p-5 text-center transition duration-300",
                "hover:-translate-y-0.5 hover:border-line-strong",
                a.unlocked && "border-gold/25",
              )}
            >
              <AchievementBadge
                achievement={a.achievement}
                unlocked={a.unlocked}
                className="transition duration-300 group-hover:scale-105"
              />
              <span className={cn("mt-4 font-display font-semibold", a.unlocked ? "text-fg" : "text-fg-muted")}>
                {a.achievement.title}
              </span>
              <span className="mt-1 text-xs leading-relaxed text-fg-subtle">{a.achievement.criterionLabel}</span>
              <span className="mt-auto w-full pt-4">
                <ProgressBar
                  value={a.target ? a.current / a.target : 0}
                  size="sm"
                  label={`${a.achievement.title} progress`}
                  valueText={progressText(a)}
                />
                <span className="mt-1.5 block font-mono text-[0.65rem] text-fg-subtle">{progressText(a)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <Dialog
          open
          onClose={() => setOpenId(null)}
          title={open.achievement.title}
          description={`${tierLabel(open.achievement.tier)} achievement`}
        >
          <div className="flex flex-col items-center text-center">
            <AchievementBadge achievement={open.achievement} unlocked={open.unlocked} size="lg" />
            <p className="mt-5 text-fg-muted">{open.achievement.description}</p>
            <div className="mt-5 w-full rounded-xl bg-white/[0.03] p-4 text-left ring-1 ring-inset ring-line">
              <p className="eyebrow mb-1.5">How to unlock</p>
              <p className="text-sm">{open.achievement.criterionLabel}</p>
              <div className="mt-3">
                <ProgressBar
                  value={open.target ? open.current / open.target : 0}
                  label={`${open.achievement.title} progress`}
                  valueText={progressText(open)}
                />
                <p className="mt-1.5 font-mono text-xs text-fg-subtle">{progressText(open)}</p>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm">
              {open.unlocked ? (
                <>
                  <CircleCheck className="h-4 w-4 text-emerald" aria-hidden="true" />
                  Unlocked {open.unlockedAt ? formatDate(open.unlockedAt) : ""}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
                  <span className="text-fg-muted">Not yet unlocked</span>
                </>
              )}
            </p>
          </div>
        </Dialog>
      )}
    </>
  );
}
