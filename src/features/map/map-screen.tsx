"use client";

import { useProgress } from "@/features/progress/progress-provider";
import { PageHeader } from "@/features/shell/page-header";
import { MissionMap } from "./mission-map";

export function MapScreen() {
  const { progress } = useProgress();
  return (
    <>
      <PageHeader
        eyebrow="Mission map"
        title="Five worlds. One research programmer."
        description="Each world builds on the last. Select a world to read its briefing — clear a world’s challenges and boss to unlock the next."
      >
        <p className="font-mono text-sm text-fg-muted">
          {progress.clearedMissionCount}/{progress.missionCount} worlds cleared
        </p>
      </PageHeader>
      <MissionMap progress={progress} />
    </>
  );
}
