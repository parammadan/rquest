/**
 * Developer-only seeded progress, used to visually verify locked, active,
 * and completed states. Seeded snapshots live under their own storage key,
 * are flagged origin = "dev-scenario", and the app shows a persistent banner
 * while one is loaded. They never touch the real learner's progress.
 */
import type { Catalog } from "../../content/catalog.ts";
import { expectedValidatorId } from "../../domain/progression.ts";
import type { MissionId, ProgressSnapshot } from "../../domain/types.ts";

export const DEV_SCENARIO_STORAGE_KEY = "rquest:dev-scenario:v1";

export const DEV_TOOLS_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_RQUEST_DEV_TOOLS === "1";

export interface DevScenario {
  id: string;
  name: string;
  description: string;
  /** Missions completed in full, then partial items of the next mission. */
  completeMissions: MissionId[];
  partial?: { missionId: MissionId; items: number };
}

export const DEV_SCENARIOS: readonly DevScenario[] = [
  {
    id: "world-1-active",
    name: "World 1 in progress",
    description: "Three items of The Data Lab completed. Shows an active mission and partial XP.",
    completeMissions: [],
    partial: { missionId: "data-lab", items: 3 },
  },
  {
    id: "world-3-active",
    name: "Worlds 1–2 complete, World 3 active",
    description: "Shows completed, in-progress, available-by-prerequisite, and locked worlds together.",
    completeMissions: ["data-lab", "package-factory"],
    partial: { missionId: "debugging-crisis", items: 2 },
  },
  {
    id: "academy-complete",
    name: "Academy complete",
    description: "Every item validated. Shows the fully-completed map and all achievements.",
    completeMissions: [
      "data-lab",
      "package-factory",
      "debugging-crisis",
      "quality-control",
      "research-mission",
    ],
  },
];

export function buildScenarioSnapshot(
  scenario: DevScenario,
  catalog: Catalog,
): ProgressSnapshot {
  const items = [
    ...scenario.completeMissions.flatMap((id) => catalog.getMission(id)?.items ?? []),
    ...(scenario.partial
      ? (catalog.getMission(scenario.partial.missionId)?.items ?? []).slice(
          0,
          scenario.partial.items,
        )
      : []),
  ];
  const base = Date.UTC(2026, 0, 5, 14, 0, 0);
  return {
    schemaVersion: 1,
    learnerId: "dev-scenario",
    origin: "dev-scenario",
    scenarioName: scenario.name,
    events: items.map((item, i) => {
      const at = new Date(base + i * 36e5).toISOString();
      return {
        id: `seed-${scenario.id}-${i}`,
        type: "item.completed" as const,
        itemId: item.id,
        itemKind: item.kind,
        missionId: item.missionId,
        occurredAt: at,
        receipt: {
          validatorId: expectedValidatorId(item),
          verdict: "passed" as const,
          checkedAt: at,
          evidenceDigest: "dev-seed",
        },
      };
    }),
  };
}
