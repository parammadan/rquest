import type {
  Achievement,
  Mission,
  MissionId,
  MissionItem,
} from "../domain/types.ts";
import { ACHIEVEMENTS } from "./achievements.ts";
import { MISSIONS } from "./missions.ts";

/** Read-only, indexed view over all academy content. */
export interface Catalog {
  missions: readonly Mission[];
  achievements: readonly Achievement[];
  getMission(id: string): Mission | undefined;
  getItem(id: string): MissionItem | undefined;
  getAchievement(id: string): Achievement | undefined;
}

export function createCatalog(
  missions: readonly Mission[],
  achievements: readonly Achievement[],
): Catalog {
  const sorted = [...missions].sort((a, b) => a.order - b.order);
  const missionById = new Map<string, Mission>(sorted.map((m) => [m.id, m]));
  const itemById = new Map<string, MissionItem>();
  for (const m of sorted) {
    for (const item of m.items) {
      if (itemById.has(item.id)) {
        throw new Error(`Duplicate mission item id: ${item.id}`);
      }
      itemById.set(item.id, item);
    }
    for (const req of m.requires) {
      if (!missionById.has(req)) {
        throw new Error(`Mission ${m.id} requires unknown mission ${req}`);
      }
    }
  }
  const achievementById = new Map(achievements.map((a) => [a.id, a]));
  return {
    missions: sorted,
    achievements,
    getMission: (id) => missionById.get(id),
    getItem: (id) => itemById.get(id),
    getAchievement: (id) => achievementById.get(id),
  };
}

export const catalog: Catalog = createCatalog(MISSIONS, ACHIEVEMENTS);

export function isMissionId(id: string): id is MissionId {
  return catalog.getMission(id) !== undefined;
}
