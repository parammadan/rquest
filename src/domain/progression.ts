/**
 * Progression rules. Pure functions: (snapshot, catalog) -> derived state.
 *
 * Nothing about a learner's progress is stored except completion events.
 * XP, levels, mission states, and achievements are always re-derived, so
 * they can never drift from the evidence.
 */
import type { Catalog } from "../content/catalog.ts";
import { levelForXp, type LevelInfo } from "./levels.ts";
import type {
  Achievement,
  AchievementCriterion,
  ItemCompletedEvent,
  Mission,
  MissionId,
  MissionItem,
  MissionStatus,
  ProgressOrigin,
  ProgressSnapshot,
  XpEvent,
} from "./types.ts";

export interface MissionProgress {
  missionId: MissionId;
  status: MissionStatus;
  lessonsCompleted: number;
  lessonsTotal: number;
  challengesCompleted: number;
  challengesTotal: number;
  bossDefeated: boolean;
  /** Every challenge (boss included) validated — the unlock condition. */
  cleared: boolean;
  itemsCompleted: number;
  itemsTotal: number;
  /** 0..1 */
  fraction: number;
  xpEarned: number;
  xpAvailable: number;
  /** Prerequisite missions not yet cleared (empty when unlocked). */
  unmetPrerequisites: MissionId[];
}

export interface AchievementProgress {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt: string | null;
  current: number;
  target: number;
}

export type RejectionReason =
  | "unknown-item"
  | "item-mismatch"
  | "invalid-receipt"
  | "duplicate"
  | "mission-locked";

export interface DerivedProgress {
  origin: ProgressOrigin;
  scenarioName: string | null;
  totalXp: number;
  level: LevelInfo;
  completedItemIds: ReadonlySet<string>;
  missions: Readonly<Record<MissionId, MissionProgress>>;
  completedMissionCount: number;
  /** Worlds cleared or completed. */
  clearedMissionCount: number;
  missionCount: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  challengesCompleted: number;
  challengesTotal: number;
  bossesDefeated: number;
  itemsCompleted: number;
  itemsTotal: number;
  /** 0..1 share of all academy items completed. */
  academyCompletion: number;
  achievements: AchievementProgress[];
  unlockedAchievementCount: number;
  /** XP awards, oldest first. */
  xpLedger: XpEvent[];
  /** First in-progress mission, else first available one, else null. */
  activeMissionId: MissionId | null;
  /** Events present in storage that the rules refused to count. */
  rejected: { eventId: string; reason: RejectionReason }[];
}

/** The validator a completion receipt must name for a given item. */
export function expectedValidatorId(item: MissionItem): string {
  return item.kind === "challenge"
    ? item.evaluation.validatorId
    : item.check.validatorId;
}

export function isBoss(item: MissionItem): boolean {
  return item.kind === "challenge" && item.type === "boss";
}

/** Unlock rule: a world is cleared when all its challenges, boss included, are validated. */
export function isMissionCleared(mission: Mission, done: ReadonlySet<string>) {
  const challenges = mission.items.filter((i) => i.kind === "challenge");
  return challenges.length > 0 && challenges.every((i) => done.has(i.id));
}

export function unmetPrerequisites(
  mission: Mission,
  catalog: Catalog,
  done: ReadonlySet<string>,
): MissionId[] {
  return mission.requires.filter((req) => {
    const m = catalog.getMission(req);
    return !m || !isMissionCleared(m, done);
  });
}

/** Check one event against the rules, given what is already completed. */
export function checkEvent(
  event: ItemCompletedEvent,
  catalog: Catalog,
  done: ReadonlySet<string>,
): RejectionReason | null {
  const item = catalog.getItem(event.itemId);
  if (!item) return "unknown-item";
  if (item.kind !== event.itemKind || item.missionId !== event.missionId) {
    return "item-mismatch";
  }
  const r = event.receipt;
  if (
    !r ||
    r.verdict !== "passed" ||
    r.validatorId !== expectedValidatorId(item) ||
    typeof r.checkedAt !== "string"
  ) {
    return "invalid-receipt";
  }
  if (done.has(item.id)) return "duplicate";
  const mission = catalog.getMission(item.missionId);
  if (!mission || unmetPrerequisites(mission, catalog, done).length > 0) {
    return "mission-locked";
  }
  return null;
}

function criterionProgress(
  c: AchievementCriterion,
  catalog: Catalog,
  done: ReadonlySet<string>,
  xp: number,
  bosses: number,
): { current: number; target: number } {
  switch (c.type) {
    case "items-completed":
      return { current: done.size, target: c.count };
    case "bosses-defeated":
      return { current: bosses, target: c.count };
    case "xp-earned":
      return { current: xp, target: c.amount };
    case "mission-cleared": {
      const m = catalog.getMission(c.missionId);
      const items = (m?.items ?? []).filter((i) => i.kind === "challenge");
      return {
        current: items.filter((i) => done.has(i.id)).length,
        target: items.length,
      };
    }
  }
}

export function deriveProgress(
  snapshot: ProgressSnapshot,
  catalog: Catalog,
): DerivedProgress {
  const done = new Set<string>();
  const xpLedger: XpEvent[] = [];
  const rejected: DerivedProgress["rejected"] = [];
  const unlockedAt = new Map<string, string>();
  let totalXp = 0;
  let bosses = 0;

  // Replay events in stored order; first valid completion of an item wins.
  for (const event of snapshot.events) {
    // Attempts are learning evidence only; XP, unlocks, and achievements come from completions.
    if (event.type !== "item.completed") continue;
    const reason = checkEvent(event, catalog, done);
    if (reason) {
      rejected.push({ eventId: event.id, reason });
      continue;
    }
    const item = catalog.getItem(event.itemId)!;
    done.add(item.id);
    if (isBoss(item)) bosses += 1;
    // XP always comes from the catalog, never from the stored event.
    totalXp += item.xp;
    xpLedger.push({
      id: `xp:${event.id}`,
      sourceEventId: event.id,
      itemId: item.id,
      itemTitle: item.title,
      missionId: item.missionId,
      amount: item.xp,
      awardedAt: event.occurredAt,
    });
    for (const a of catalog.achievements) {
      if (unlockedAt.has(a.id)) continue;
      const p = criterionProgress(a.criterion, catalog, done, totalXp, bosses);
      if (p.current >= p.target) unlockedAt.set(a.id, event.occurredAt);
    }
  }

  const missions = {} as Record<MissionId, MissionProgress>;
  let lessonsCompleted = 0;
  let lessonsTotal = 0;
  let challengesCompleted = 0;
  let challengesTotal = 0;
  let completedMissionCount = 0;
  let clearedMissionCount = 0;
  let itemsTotal = 0;
  let activeMissionId: MissionId | null = null;
  let firstAvailable: MissionId | null = null;

  for (const mission of catalog.missions) {
    const unmet = unmetPrerequisites(mission, catalog, done);
    let lc = 0, lt = 0, cc = 0, ct = 0, xpEarned = 0, xpAvailable = 0;
    let bossDefeated = false;
    for (const item of mission.items) {
      const isDone = done.has(item.id);
      xpAvailable += item.xp;
      if (isDone) xpEarned += item.xp;
      if (item.kind === "lesson") {
        lt += 1;
        if (isDone) lc += 1;
      } else {
        ct += 1;
        if (isDone) cc += 1;
        if (isDone && item.type === "boss") bossDefeated = true;
      }
    }
    const itemsCompleted = lc + cc;
    const total = mission.items.length;
    const cleared = ct > 0 && cc === ct;
    let status: MissionStatus;
    if (total > 0 && itemsCompleted === total) status = "completed";
    else if (cleared) status = "cleared";
    else if (unmet.length > 0) status = "locked";
    else if (itemsCompleted > 0) status = "in-progress";
    else status = "available";

    if (status === "completed") completedMissionCount += 1;
    if (cleared) clearedMissionCount += 1;
    if (status === "in-progress" && !activeMissionId) activeMissionId = mission.id;
    if (status === "available" && !firstAvailable) firstAvailable = mission.id;

    lessonsCompleted += lc;
    lessonsTotal += lt;
    challengesCompleted += cc;
    challengesTotal += ct;
    itemsTotal += total;

    missions[mission.id] = {
      missionId: mission.id,
      status,
      lessonsCompleted: lc,
      lessonsTotal: lt,
      challengesCompleted: cc,
      challengesTotal: ct,
      bossDefeated,
      cleared,
      itemsCompleted,
      itemsTotal: total,
      fraction: total ? itemsCompleted / total : 0,
      xpEarned,
      xpAvailable,
      unmetPrerequisites: unmet,
    };
  }

  const achievements: AchievementProgress[] = catalog.achievements.map((a) => {
    const p = criterionProgress(a.criterion, catalog, done, totalXp, bosses);
    const at = unlockedAt.get(a.id) ?? null;
    return {
      achievement: a,
      unlocked: at !== null,
      unlockedAt: at,
      current: Math.min(p.current, p.target),
      target: p.target,
    };
  });

  return {
    origin: snapshot.origin,
    scenarioName: snapshot.scenarioName ?? null,
    totalXp,
    level: levelForXp(totalXp),
    completedItemIds: done,
    missions,
    completedMissionCount,
    clearedMissionCount,
    missionCount: catalog.missions.length,
    lessonsCompleted,
    lessonsTotal,
    challengesCompleted,
    challengesTotal,
    bossesDefeated: bosses,
    itemsCompleted: done.size,
    itemsTotal,
    academyCompletion: itemsTotal ? done.size / itemsTotal : 0,
    achievements,
    unlockedAchievementCount: achievements.filter((a) => a.unlocked).length,
    xpLedger,
    activeMissionId: activeMissionId ?? firstAvailable,
    rejected,
  };
}

export function emptySnapshot(learnerId = "demo-learner"): ProgressSnapshot {
  return { schemaVersion: 2, learnerId, origin: "learner", events: [] };
}
