import type { Mission } from "@/domain/types";
import { isBoss } from "@/domain/progression";

export interface MissionSummary {
  lessons: number;
  challenges: number;
  bosses: number;
  totalXp: number;
  totalMinutes: number;
}

export function summarizeMission(mission: Mission): MissionSummary {
  let lessons = 0, challenges = 0, bosses = 0, totalXp = 0, totalMinutes = 0;
  for (const item of mission.items) {
    totalXp += item.xp;
    totalMinutes += item.estimatedMinutes;
    if (item.kind === "lesson") lessons += 1;
    else if (isBoss(item)) bosses += 1;
    else challenges += 1;
  }
  return { lessons, challenges, bosses, totalXp, totalMinutes };
}
