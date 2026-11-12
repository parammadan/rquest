"use client";

import { CircleCheck, Lock } from "lucide-react";
import { ButtonLink, Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ProgressBar } from "@/components/ui/primitives";
import { catalog } from "@/content/catalog";
import type { Mission } from "@/domain/types";
import type { DerivedProgress } from "@/domain/progression";
import { accentStyle } from "@/features/worlds/world-visuals";
import { formatPercent } from "@/lib/format";

/** Explains exactly why a world is locked and what unlocks it. */
export function LockedMissionExplanation({
  mission,
  progress,
}: {
  mission: Mission;
  progress: DerivedProgress;
}) {
  const prereqs = mission.requires.map((id) => catalog.getMission(id)!);
  return (
    <div className="space-y-4">
      <ul className="space-y-2.5">
        {prereqs.map((p) => {
          const mp = progress.missions[p.id];
          const done = mp.cleared;
          const value = mp.challengesTotal ? mp.challengesCompleted / mp.challengesTotal : 0;
          return (
            <li key={p.id} className="panel p-3.5" style={accentStyle(p)}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {done ? (
                    <CircleCheck className="h-4 w-4 text-emerald" aria-hidden="true" />
                  ) : (
                    <Lock className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
                  )}
                  <span className="text-sm font-medium">
                    {p.worldLabel}: {p.title}
                  </span>
                </div>
                <span className="font-mono text-xs text-fg-muted">
                  {mp.challengesCompleted}/{mp.challengesTotal} challenges · {formatPercent(value)}
                </span>
              </div>
              <ProgressBar
                className="mt-2.5"
                size="sm"
                tone="accent"
                value={value}
                label={`${p.title} challenges validated`}
              />
            </li>
          );
        })}
      </ul>
      <p className="text-sm leading-relaxed text-fg-muted">
        Worlds unlock in order. Clear a world by validating every challenge and its boss mission; lessons add bonus XP
        and count toward full mastery, but don’t gate the next world.
      </p>
      <p className="rounded-xl border border-cyan/20 bg-cyan/[0.06] p-3 text-xs leading-relaxed text-fg-muted">
        <span className="font-medium text-cyan">How validation works:</span> every challenge runs real R in your
        browser (webR) and is checked against hidden tests, including inputs you haven’t seen.
      </p>
    </div>
  );
}

export function LockedMissionDialog({
  mission,
  progress,
  open,
  onClose,
}: {
  mission: Mission;
  progress: DerivedProgress;
  open: boolean;
  onClose: () => void;
}) {
  const unmet = progress.missions[mission.id].unmetPrerequisites.map((id) => catalog.getMission(id)!);
  const next = unmet[0];
  const nextUnlocked = next && progress.missions[next.id].status !== "locked";
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${mission.worldLabel} is locked`}
      description={
        unmet.length
          ? `Clear ${unmet.map((m) => `${m.worldLabel}: ${m.title}`).join(" and ")} to unlock ${mission.title}.`
          : undefined
      }
    >
      <LockedMissionExplanation mission={mission} progress={progress} />
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        {next && nextUnlocked && (
          <ButtonLink href={`/academy/missions/${next.id}`} onClick={onClose}>
            Go to {next.title}
          </ButtonLink>
        )}
      </div>
    </Dialog>
  );
}
