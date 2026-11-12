import assert from "node:assert/strict";
import { test } from "node:test";
import { catalog, createCatalog } from "../content/catalog.ts";
import { MISSIONS } from "../content/missions.ts";
import { ACHIEVEMENTS } from "../content/achievements.ts";
import { buildScenarioSnapshot, DEV_SCENARIOS } from "../features/progress/dev-scenarios.ts";
import { createProgressStore } from "../features/progress/progress-store.ts";
import {
  createMemoryStorage,
  createStorageRepository,
  parseSnapshot,
  PROGRESS_STORAGE_KEY,
} from "../persistence/progress-repository.ts";
import {
  createValidatorRegistry,
  NO_VALIDATORS,
  submitCompletion,
} from "./completion.ts";
import { ACTIVE_VALIDATORS, VALIDATORS, validatorForChallenge } from "../content/validators/index.ts";
import { REFERENCE_SOLUTIONS } from "../content/validators/reference-solutions.ts";
import { interpretVerdicts } from "./evaluation.ts";
import { levelForXp } from "./levels.ts";
import { deriveProgress, emptySnapshot, expectedValidatorId } from "./progression.ts";
import type { ItemCompletedEvent, MissionItem, ProgressSnapshot } from "./types.ts";

const world1 = catalog.getMission("data-lab")!;
const world2 = catalog.getMission("package-factory")!;

function completion(item: MissionItem, i = 0, validatorId?: string): ItemCompletedEvent {
  const at = new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString();
  return {
    id: `e-${item.id}-${i}`,
    type: "item.completed",
    itemId: item.id,
    itemKind: item.kind,
    missionId: item.missionId,
    occurredAt: at,
    receipt: { validatorId: validatorId ?? expectedValidatorId(item), verdict: "passed", checkedAt: at },
  };
}

function snap(events: ItemCompletedEvent[]): ProgressSnapshot {
  return { ...emptySnapshot(), events };
}

test("fresh learner: zero XP, World 1 available, Worlds 2-5 locked", () => {
  const p = deriveProgress(emptySnapshot(), catalog);
  assert.equal(p.totalXp, 0);
  assert.equal(p.level.level, 1);
  assert.equal(p.completedMissionCount, 0);
  assert.equal(p.unlockedAchievementCount, 0);
  assert.equal(p.xpLedger.length, 0);
  assert.equal(p.missions["data-lab"].status, "available");
  for (const id of ["package-factory", "debugging-crisis", "quality-control", "research-mission"] as const) {
    assert.equal(p.missions[id].status, "locked", id);
  }
  assert.deepEqual(p.missions["package-factory"].unmetPrerequisites, ["data-lab"]);
  assert.equal(p.activeMissionId, "data-lab");
});

test("XP comes from the catalog and is awarded once per item", () => {
  const item = world1.items[0];
  const e = completion(item);
  const tampered = { ...completion(item, 1), id: "dup" };
  const p = deriveProgress(snap([e, tampered]), catalog);
  assert.equal(p.totalXp, item.xp);
  assert.equal(p.xpLedger.length, 1);
  assert.deepEqual(p.rejected, [{ eventId: "dup", reason: "duplicate" }]);
});

test("events with a wrong or missing validator are not counted", () => {
  const item = world1.items[0];
  const p = deriveProgress(snap([completion(item, 0, "ui:button-click")]), catalog);
  assert.equal(p.totalXp, 0);
  assert.equal(p.rejected[0].reason, "invalid-receipt");
});

test("completions inside a locked mission are rejected", () => {
  const p = deriveProgress(snap([completion(world2.items[0])]), catalog);
  assert.equal(p.totalXp, 0);
  assert.equal(p.rejected[0].reason, "mission-locked");
});

test("completing World 1 unlocks World 2 and awards Data Explorer", () => {
  const p = deriveProgress(snap(world1.items.map((it, i) => completion(it, i))), catalog);
  assert.equal(p.missions["data-lab"].status, "completed");
  assert.equal(p.missions["package-factory"].status, "available");
  assert.equal(p.missions["debugging-crisis"].status, "locked");
  const unlocked = p.achievements.filter((a) => a.unlocked).map((a) => a.achievement.id);
  assert.deepEqual(unlocked.sort(), ["data-explorer", "first-steps"]);
  assert.equal(p.activeMissionId, "package-factory");
});

test("clearing World 1 (challenges + boss, no lessons) unlocks World 2", () => {
  const challenges = world1.items.filter((i) => i.kind === "challenge");
  const p = deriveProgress(snap(challenges.map((it, i) => completion(it, i))), catalog);
  const w1 = p.missions["data-lab"];
  assert.equal(w1.status, "cleared");
  assert.equal(w1.cleared, true);
  assert.ok(w1.fraction < 1, "lessons still count toward mastery");
  assert.equal(p.missions["package-factory"].status, "available");
  assert.equal(p.missions["debugging-crisis"].status, "locked");
  assert.equal(p.clearedMissionCount, 1);
  assert.equal(p.completedMissionCount, 0);
  assert.equal(p.activeMissionId, "package-factory");
  const explorer = p.achievements.find((a) => a.achievement.id === "data-explorer")!;
  assert.equal(explorer.unlocked, true);
  assert.equal(explorer.target, 3);
});

test("a partially cleared world keeps the next one locked", () => {
  const two = world1.items.filter((i) => i.kind === "challenge").slice(0, 2);
  const p = deriveProgress(snap(two.map((it, i) => completion(it, i))), catalog);
  assert.equal(p.missions["data-lab"].status, "in-progress");
  assert.equal(p.missions["package-factory"].status, "locked");
});

test("planned items (lessons, unauthored challenges) can never be submitted", () => {
  const planned = catalog.missions.flatMap((m) => m.items).filter((i) => i.availability.status === "planned");
  assert.ok(planned.length > 0);
  for (const item of planned) {
    const r = submitCompletion(emptySnapshot(), catalog, ACTIVE_VALIDATORS, {
      itemId: item.id,
      receipt: { validatorId: expectedValidatorId(item), verdict: "passed", checkedAt: "x" },
    });
    assert.deepEqual(r, { ok: false, reason: "item-not-available" }, item.id);
  }
});

test("World 1 challenges accept only a receipt from their own validator, once", () => {
  const item = catalog.getItem("data-lab.challenge-1")!;
  const receipt = { validatorId: expectedValidatorId(item), verdict: "passed" as const, checkedAt: "t" };
  const ok = submitCompletion(emptySnapshot(), catalog, ACTIVE_VALIDATORS, { itemId: item.id, receipt });
  assert.ok(ok.ok);
  const dup = submitCompletion(snap([ok.event]), catalog, ACTIVE_VALIDATORS, { itemId: item.id, receipt });
  assert.deepEqual(dup, { ok: false, reason: "duplicate" });
  const other = catalog.getItem("data-lab.challenge-2")!;
  const crossed = submitCompletion(emptySnapshot(), catalog, ACTIVE_VALIDATORS, {
    itemId: other.id,
    receipt, // challenge-1's validator presented for challenge-2
  });
  assert.deepEqual(crossed, { ok: false, reason: "invalid-receipt" });
  assert.equal(submitCompletion(emptySnapshot(), catalog, NO_VALIDATORS, { itemId: item.id, receipt }).ok, false);
});

test("every available challenge has exactly one validator, and vice versa", () => {
  const available = catalog.missions
    .flatMap((m) => m.items)
    .filter((i) => i.kind === "challenge" && i.availability.status === "available");
  assert.equal(available.length, VALIDATORS.length);
  for (const item of available) {
    const v = validatorForChallenge(item.id);
    assert.ok(v, item.id);
    assert.equal(v.validatorId, expectedValidatorId(item));
    assert.ok(ACTIVE_VALIDATORS.has(v.validatorId));
    assert.equal(new Set(v.checks.map((c) => c.id)).size, v.checks.length, `${item.id} check ids`);
  }
  for (const v of VALIDATORS) assert.equal(catalog.getItem(v.challengeId)?.availability.status, "available");
  for (const id of Object.keys(REFERENCE_SOLUTIONS)) assert.ok(validatorForChallenge(id), id);
});

test("harness verdicts map onto checks; anything malformed is not a pass", () => {
  const v = VALIDATORS[0];
  const n = v.checks.length;
  assert.equal(interpretVerdicts(v, Array(n).fill("PASS")).status, "passed");
  assert.equal(interpretVerdicts(v, ["FAIL", ...Array(n - 1).fill("PASS")]).status, "failed");
  assert.equal(interpretVerdicts(v, ["ERROR", "boom"]).status, "error");
  assert.equal(interpretVerdicts(v, Array(n - 1).fill("PASS")).status, "runtime-error");
  assert.equal(interpretVerdicts(v, [...Array(n - 1).fill("PASS"), "TRUE"]).status, "runtime-error");
});

test("with an available item and registered validator, duplicates are refused", () => {
  const missions = structuredClone(MISSIONS) as typeof MISSIONS;
  const item = missions[0].items[2];
  item.availability = { status: "available" };
  const cat = createCatalog(missions, ACHIEVEMENTS);
  const validators = createValidatorRegistry([expectedValidatorId(item)]);
  const receipt = { validatorId: expectedValidatorId(item), verdict: "passed" as const, checkedAt: "t" };
  const first = submitCompletion(emptySnapshot(), cat, validators, { itemId: item.id, receipt });
  assert.ok(first.ok);
  const second = submitCompletion(snap([first.event]), cat, validators, { itemId: item.id, receipt });
  assert.deepEqual(second, { ok: false, reason: "duplicate" });
  const forged = submitCompletion(emptySnapshot(), cat, validators, {
    itemId: item.id,
    receipt: { ...receipt, validatorId: "forged" },
  });
  assert.deepEqual(forged, { ok: false, reason: "validator-unavailable" });
});

test("storage repository survives reloads and ignores malformed data", () => {
  const storage = createMemoryStorage();
  const repo = createStorageRepository(storage);
  repo.append(completion(world1.items[0]));
  const reloaded = createStorageRepository(storage).read();
  assert.equal(reloaded.events.length, 1);
  assert.equal(parseSnapshot("{not json").events.length, 0);
  assert.equal(parseSnapshot(JSON.stringify({ schemaVersion: 9, events: [] })).events.length, 0);
  assert.equal(
    parseSnapshot(JSON.stringify({ schemaVersion: 1, events: [{ type: "xp", amount: 9999 }] })).events.length,
    0,
  );
});

test("repository returns a stable object until data changes", () => {
  const repo = createStorageRepository(createMemoryStorage());
  assert.equal(repo.read(), repo.read());
});

test("dev scenarios never write to the learner's progress", () => {
  const storage = createMemoryStorage();
  const store = createProgressStore({ storage, devToolsEnabled: true });
  assert.ok(store.loadScenario("world-3-active"));
  const s = store.getSnapshot();
  assert.equal(s.progress.origin, "dev-scenario");
  assert.ok(s.progress.totalXp > 0);
  assert.equal(storage.getItem(PROGRESS_STORAGE_KEY), null);
  store.exitScenario();
  assert.equal(store.getSnapshot().progress.totalXp, 0);
  assert.equal(store.getSnapshot().progress.origin, "learner");
});

test("dev scenarios are ignored when dev tools are disabled", () => {
  const storage = createMemoryStorage();
  const def = DEV_SCENARIOS[0];
  storage.setItem("rquest:dev-scenario:v1", JSON.stringify(buildScenarioSnapshot(def, catalog)));
  const store = createProgressStore({ storage, devToolsEnabled: false });
  assert.equal(store.loadScenario(def.id), false);
  assert.equal(store.getSnapshot().progress.origin, "learner");
  assert.equal(store.getSnapshot().progress.totalXp, 0);
});

test("seeded scenarios are internally valid (no rejected events)", () => {
  for (const def of DEV_SCENARIOS) {
    const p = deriveProgress(buildScenarioSnapshot(def, catalog), catalog);
    assert.deepEqual(p.rejected, [], def.id);
  }
  const all = deriveProgress(buildScenarioSnapshot(DEV_SCENARIOS[2], catalog), catalog);
  assert.equal(all.academyCompletion, 1);
  assert.equal(all.unlockedAchievementCount, catalog.achievements.length);
});

test("level curve", () => {
  assert.equal(levelForXp(0).level, 1);
  assert.equal(levelForXp(149).level, 1);
  assert.equal(levelForXp(150).level, 2);
  assert.equal(levelForXp(99999).nextLevelXp, null);
  assert.equal(levelForXp(99999).fraction, 1);
});
