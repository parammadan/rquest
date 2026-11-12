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
import { LEVELS, levelForXp } from "./levels.ts";
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
  // Every shipped item is available now, so mark one lesson and one challenge per world as planned.
  const plannedAv = { status: "planned", phase: 3, note: "test" } as const;
  const withPlanned = createCatalog(
    MISSIONS.map((m) => ({
      ...m,
      items: m.items.map((i, n) => (n < 2 ? { ...i, availability: plannedAv } : i)),
    })),
    ACHIEVEMENTS,
  );
  const planned = withPlanned.missions.flatMap((m) => m.items).filter((i) => i.availability.status === "planned");
  assert.ok(planned.some((i) => i.kind === "lesson") && planned.some((i) => i.kind === "challenge"));
  for (const item of planned) {
    const r = submitCompletion(emptySnapshot(), withPlanned, ACTIVE_VALIDATORS, {
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
  const syntax = interpretVerdicts(v, ["SYNTAX", "unexpected '{'"]);
  assert.ok(syntax.status === "error" && syntax.kind === "syntax" && syntax.checks.every((c) => !c.passed));
  const runtime = interpretVerdicts(v, ["ERROR", "boom"]);
  assert.ok(runtime.status === "error" && runtime.kind === "runtime" && /boom/.test(runtime.message));
  const tamper = interpretVerdicts(v, ["TAMPER", "isTRUE"]);
  assert.ok(tamper.status === "integrity" && /isTRUE/.test(tamper.message));
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

test("every level is reachable, thresholds increase, and a fully completed learner is at the top level", () => {
  const available = catalog.missions.flatMap((m) => m.items).reduce((n, i) => n + i.xp, 0);
  assert.equal(available, 2100);
  for (let i = 1; i < LEVELS.length; i++) assert.ok(LEVELS[i].minXp > LEVELS[i - 1].minXp, `level ${i + 1}`);
  assert.ok(LEVELS.at(-1)!.minXp <= available, "top level must be reachable");
  // Fresh, intermediate, and fully completed learners.
  const fresh = deriveProgress(emptySnapshot(), catalog);
  assert.equal(fresh.level.level, 1);
  assert.equal(fresh.level.xpNeededForNext, 150);
  const all = deriveProgress(buildScenarioSnapshot(DEV_SCENARIOS[2], catalog), catalog);
  assert.equal(all.totalXp, 2100);
  assert.equal(all.level.level, LEVELS.length);
  assert.equal(all.level.xpNeededForNext, null, "no impossible 'XP to next level' at the top");
  assert.equal(all.unlockedAchievementCount, 8);
  // A Phase 2 learner with every challenge but no lessons: 1,800 XP, Level 6, 200 XP from the top.
  const everyEvent = buildScenarioSnapshot(DEV_SCENARIOS[2], catalog).events;
  const challengesOnly = deriveProgress(
    { ...emptySnapshot(), events: everyEvent.filter((e) => e.type === "item.completed" && e.itemKind === "challenge") },
    catalog,
  );
  assert.equal(challengesOnly.totalXp, 1800);
  assert.equal(challengesOnly.level.level, 6);
  assert.equal(challengesOnly.level.xpNeededForNext, 200);
});

/* ---------------------------- Phase 3A: lessons ---------------------------- */

import { gradeKnowledgeCheck } from "./knowledge-check.ts";
import { DEBRIEF_VIDEOS, getDebrief, getVideo, VIDEOS } from "../content/videos.ts";
import { LESSON_CHECK_IDS } from "../content/validators/index.ts";
import type { Lesson } from "./types.ts";

const allItems = catalog.missions.flatMap((m) => m.items);
const lessons = allItems.filter((i): i is Lesson => i.kind === "lesson");

test("every world has three lessons, each directly before the challenge it prepares for", () => {
  for (const m of catalog.missions) {
    const ls = m.items.filter((i) => i.kind === "lesson");
    assert.equal(ls.length, 3, m.id);
    m.items.forEach((item, i) => {
      if (item.kind === "lesson") {
        assert.equal(m.items[i + 1]?.id, item.challengeId, `${item.id} precedes its challenge`);
        assert.equal(catalog.getItem(item.challengeId)?.missionId, m.id);
      }
    });
  }
});

const READY = ["data-lab", "package-factory", "debugging-crisis", "quality-control", "research-mission"];
test("one video per world; ready worlds have media, the rest have no sources", () => {
  assert.equal(VIDEOS.length, 5);
  for (const m of catalog.missions) assert.ok(VIDEOS.some((v) => v.missionId === m.id), m.id);
  for (const v of VIDEOS) {
    if (READY.includes(v.missionId)) {
      assert.equal(v.status, "ready");
      assert.ok(v.sources.mp4 && v.captionsVtt && v.transcript.length > 10 && v.chapters.length >= 3);
      const [lo, hi] = v.missionId === "package-factory" ? [240, 300] : [150, 260];
      assert.ok(v.durationSec! > lo && v.durationSec! < hi, `${v.id} duration ${v.durationSec}`);
    } else {
      assert.equal(v.status, "planned");
      assert.deepEqual(v.sources, { mp4: null, youtubeId: null });
    }
  }
  for (const l of lessons) assert.ok(getVideo(l.videoId), `${l.id} → ${l.videoId}`);
});

test("live lessons are complete: chapters exist, questions are well-formed, check is registered", () => {
  const live = lessons.filter((l) => l.availability.status === "available");
  assert.deepEqual(live.map((l) => l.id), [
    "data-lab.lesson-1", "data-lab.lesson-2", "data-lab.lesson-3",
    "package-factory.lesson-1", "package-factory.lesson-2", "package-factory.lesson-3",
    "debugging-crisis.lesson-1", "debugging-crisis.lesson-2", "debugging-crisis.lesson-3",
    "quality-control.lesson-1", "quality-control.lesson-2", "quality-control.lesson-3",
    "research-mission.lesson-1", "research-mission.lesson-2", "research-mission.lesson-3",
  ]);
  for (const l of live) {
    const video = getVideo(l.videoId)!;
    for (const c of l.chapterIds) assert.ok(video.chapters.some((ch) => ch.id === c && ch.lessonId === l.id), `${l.id} chapter ${c}`);
    assert.ok(l.knowledgeCheck.length >= 2);
    assert.equal(new Set(l.knowledgeCheck.map((q) => q.id)).size, l.knowledgeCheck.length);
    for (const q of l.knowledgeCheck) assert.ok(q.options.some((o) => o.id === q.correctOptionId), `${l.id}/${q.id}`);
    assert.ok(LESSON_CHECK_IDS.includes(l.check.validatorId));
    assert.ok(ACTIVE_VALIDATORS.has(l.check.validatorId));
  }
  for (const l of lessons.filter((x) => x.availability.status === "planned")) {
    assert.ok(!ACTIVE_VALIDATORS.has(l.check.validatorId), `${l.id} must not be completable`);
  }
});

test("knowledge check: complete only when every answer is correct", () => {
  const l = catalog.getItem("data-lab.lesson-1") as Lesson;
  const right = Object.fromEntries(l.knowledgeCheck.map((q) => [q.id, q.correctOptionId]));
  assert.equal(gradeKnowledgeCheck(l, right).allCorrect, true);
  const oneWrong = { ...right, [l.knowledgeCheck[0].id]: l.knowledgeCheck[0].options.find((o) => o.id !== l.knowledgeCheck[0].correctOptionId)!.id };
  assert.equal(gradeKnowledgeCheck(l, oneWrong).allCorrect, false);
  assert.equal(gradeKnowledgeCheck(l, {}).allCorrect, false);
});

test("a lesson awards its XP once and doesn't clear a world; challenges + lessons = mastered", () => {
  const l1 = catalog.getItem("data-lab.lesson-1")!;
  const receipt = { validatorId: expectedValidatorId(l1), verdict: "passed" as const, checkedAt: "t" };
  const first = submitCompletion(emptySnapshot(), catalog, ACTIVE_VALIDATORS, { itemId: l1.id, receipt });
  assert.ok(first.ok);
  const p1 = deriveProgress(snap([first.event]), catalog);
  assert.equal(p1.totalXp, 20);
  assert.equal(p1.missions["data-lab"].status, "in-progress");
  assert.equal(p1.missions["package-factory"].status, "locked");
  assert.deepEqual(submitCompletion(snap([first.event]), catalog, ACTIVE_VALIDATORS, { itemId: l1.id, receipt }), { ok: false, reason: "duplicate" });
  const everything = deriveProgress(snap(world1.items.map((it, i) => completion(it, i))), catalog);
  assert.equal(everything.missions["data-lab"].status, "completed");
  assert.equal(everything.missions["data-lab"].fraction, 1);
});

test("legacy Phase 2 progress (challenges only) keeps every world cleared and every achievement", () => {
  const challengesOnly = allItems.filter((i) => i.kind === "challenge").map((it, i) => completion(it, i));
  const p = deriveProgress(snap(challengesOnly), catalog);
  assert.deepEqual(p.rejected, []);
  assert.equal(p.clearedMissionCount, 5);
  assert.equal(p.totalXp, 1800);
  assert.equal(p.unlockedAchievementCount, catalog.achievements.length);
  for (const m of catalog.missions) assert.equal(p.missions[m.id].status, "cleared");
});

/* ---------------------------- Phase 3B: World 2 ---------------------------- */

test("every wrong option in a live lesson explains why it's wrong", () => {
  for (const l of lessons.filter((x) => x.availability.status === "available")) {
    for (const q of l.knowledgeCheck) {
      for (const o of q.options) {
        if (o.id !== q.correctOptionId) assert.ok(o.feedback && o.feedback.length > 20, `${l.id}/${q.id}/${o.id}`);
      }
    }
  }
});

test("walkthrough highlights point at real lines of each step's code", () => {
  for (const l of lessons.filter((x) => x.walkthrough)) {
    let code = l.walkthrough!.code;
    for (const [i, step] of l.walkthrough!.steps.entries()) {
      code = step.code ?? code;
      const n = code.split("\n").length;
      for (const h of step.highlight) assert.ok(h >= 1 && h <= n, `${l.id} step ${i + 1} highlights line ${h} of ${n}`);
    }
  }
});

test("World 2: lessons prepare for their own challenges; assembly and boss briefing are wired", () => {
  const pf = catalog.getMission("package-factory")!;
  const ls = pf.items.filter((i): i is Lesson => i.kind === "lesson");
  assert.deepEqual(ls.map((l) => l.challengeId), ["package-factory.challenge-1", "package-factory.challenge-2", "package-factory.boss"]);
  for (const l of ls) assert.ok(l.reward && l.knowledgeCheck.length === 3, l.id);
  for (const part of pf.assembly!.parts) {
    for (const id of part.assembledBy) assert.equal(catalog.getItem(id)?.missionId, "package-factory", `${part.id} → ${id}`);
  }
  const briefed = allItems.filter((i) => i.kind === "challenge" && i.bossBriefing);
  assert.deepEqual(briefed.map((i) => i.id), ["package-factory.boss"]);
});

test("existing World 1 completions still count after World 2 lessons ship", () => {
  const w1 = world1.items.map((it, i) => completion(it, i));
  const p = deriveProgress(snap(w1), catalog);
  assert.deepEqual(p.rejected, []);
  assert.equal(p.missions["data-lab"].status, "completed");
  assert.equal(p.missions["package-factory"].status, "available");
  assert.equal(p.totalXp, 320);
});

test("one boss debrief per world, ready with media, captions, and a transcript", () => {
  assert.equal(DEBRIEF_VIDEOS.length, catalog.missions.length);
  for (const m of catalog.missions) {
    const d = getDebrief(m.id)!;
    assert.equal(d.kind, "debrief");
    assert.equal(d.status, "ready", m.id);
    assert.ok(d.sources.mp4?.endsWith(`${m.id}-debrief-v1.mp4`) && d.captionsVtt && d.poster);
    assert.ok(d.durationSec! > 80 && d.durationSec! < 160, `${m.id} debrief ${d.durationSec}`);
    assert.ok(d.transcript.length >= 15 && d.chapters.length === 5);
    assert.ok(m.items.some((i) => i.kind === "challenge" && i.type === "boss"), `${m.id} has a boss`);
  }
});

/* ------------------- Milestone 4A: lessons don't hand over answers ------------------- */

test("no lesson reproduces a challenge's reference solution", () => {
  // Significant lines: whitespace-insensitive, at least 12 characters, not comments.
  const sig = (code: string) =>
    code.split("\n").map((l) => l.replace(/\s+/g, "")).filter((l) => l.length >= 12 && !l.startsWith("#"));
  const publicDefs = (code: string) =>
    [...code.matchAll(/^\s*([A-Za-z][\w.]*)\s*<-\s*function/gm)].map((m) => m[1]);
  const lessonCode = (l: Lesson) =>
    [
      ...l.explanation.flatMap((b) => (b.kind === "code" ? [b.code] : [])),
      l.walkthrough?.code ?? "",
      ...(l.walkthrough?.steps ?? []).map((s) => s.code ?? ""),
      ...l.knowledgeCheck.map((q) => q.code ?? ""),
    ].join("\n");
  const lessons = catalog.missions.flatMap((m) => m.items).filter((i): i is Lesson => i.kind === "lesson");
  assert.equal(lessons.length, 15);
  for (const l of lessons) {
    const code = lessonCode(l);
    const lines = new Set(sig(code));
    const defs = new Set(publicDefs(code));
    for (const [challengeId, ref] of Object.entries(REFERENCE_SOLUTIONS)) {
      const refLines = sig(ref);
      const hits = refLines.filter((x) => lines.has(x)).length;
      assert.ok(hits < 4 && hits / refLines.length < 0.5, `${l.id} repeats ${hits}/${refLines.length} lines of ${challengeId}`);
      const shared = publicDefs(ref).filter((d) => defs.has(d));
      assert.deepEqual(shared, [], `${l.id} defines ${shared.join(", ")}, which ${challengeId} asks the learner to write`);
    }
  }
});

/* --------------- Milestone 4A: schema v2, migration, attempt evidence --------------- */

import { LEGACY_PROGRESS_STORAGE_KEY } from "../persistence/progress-repository.ts";
import { attemptsFor, buildAttempt, evidenceFromEvaluation } from "./attempts.ts";
import { ActiveTimeMeter, IDLE_AFTER_MS } from "./active-time.ts";
import type { ChallengeAttemptedEvent } from "./types.ts";

const v1Raw = (events: unknown[]) => JSON.stringify({ schemaVersion: 1, learnerId: "v1-learner", events });
const learnerRepo = (storage: ReturnType<typeof createMemoryStorage>) =>
  createStorageRepository(storage, { key: PROGRESS_STORAGE_KEY, origin: "learner", legacyKey: LEGACY_PROGRESS_STORAGE_KEY });
const fullEvents = () => buildScenarioSnapshot(DEV_SCENARIOS[2], catalog).events;

test("a fully completed v1 learner migrates with every XP point, level 7, and all achievements", () => {
  const raw = v1Raw(fullEvents());
  const storage = createMemoryStorage({ [LEGACY_PROGRESS_STORAGE_KEY]: raw });
  const repo = learnerRepo(storage);
  const p = deriveProgress(repo.read(), catalog);
  assert.equal(p.totalXp, 2100);
  assert.equal(p.level.level, 7);
  assert.equal(p.unlockedAchievementCount, 8);
  assert.equal(p.clearedMissionCount, 5);
  assert.equal(repo.read().schemaVersion, 2);
  assert.equal(repo.read().learnerId, "v1-learner");
  assert.equal(attemptsFor(repo.read(), "data-lab.boss").length, 0, "no invented attempt history");
  // The first new event writes v2 (legacy events + the new one); v1 is left untouched.
  const at = buildAttempt(repo.read(), catalog, { challengeId: "data-lab.boss", outcome: "passed", failedCheckIds: [], activeMs: 1000, checkIds: [] });
  assert.ok(at.ok && repo.append(at.event));
  assert.equal(storage.getItem(LEGACY_PROGRESS_STORAGE_KEY), raw);
  const stored = JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY)!);
  assert.equal(stored.schemaVersion, 2);
  assert.equal(stored.events.length, fullEvents().length + 1);
  assert.equal(deriveProgress(learnerRepo(storage).read(), catalog).totalXp, 2100, "attempts never add XP");
});

test("a Phase 2 v1 learner (challenges only) keeps 1,800 XP after migration", () => {
  const challengeEvents = fullEvents().filter((e) => e.type === "item.completed" && e.itemKind === "challenge");
  const repo = learnerRepo(createMemoryStorage({ [LEGACY_PROGRESS_STORAGE_KEY]: v1Raw(challengeEvents) }));
  const p = deriveProgress(repo.read(), catalog);
  assert.equal(p.totalXp, 1800);
  assert.equal(p.clearedMissionCount, 5);
  assert.deepEqual(p.rejected, []);
});

test("completions a stale v1 tab records after migration are merged in by event id", () => {
  const events = fullEvents().filter((e) => e.missionId === "data-lab");
  const storage = createMemoryStorage({ [LEGACY_PROGRESS_STORAGE_KEY]: v1Raw(events.slice(0, 2)) });
  const repo = learnerRepo(storage);
  const at = buildAttempt(repo.read(), catalog, { challengeId: "data-lab.challenge-1", outcome: "failed", failedCheckIds: ["unseen"], activeMs: 5, checkIds: ["unseen"] });
  assert.ok(at.ok);
  repo.append(at.event); // v2 now exists
  storage.setItem(LEGACY_PROGRESS_STORAGE_KEY, v1Raw(events.slice(0, 3))); // old tab adds one completion
  repo.invalidate();
  const snap = repo.read();
  assert.equal(snap.events.filter((e) => e.type === "item.completed").length, 3);
  assert.equal(attemptsFor(snap, "data-lab.challenge-1").length, 1);
});

test("unreadable or future-version progress is never overwritten", () => {
  for (const [raw, issue] of [
    ["{not json", "unreadable"],
    [JSON.stringify({ schemaVersion: 3, events: [] }), "unsupported-version"],
    [JSON.stringify({ schemaVersion: 2, events: "nope" }), "unreadable"],
  ] as const) {
    const storage = createMemoryStorage({ [PROGRESS_STORAGE_KEY]: raw, [LEGACY_PROGRESS_STORAGE_KEY]: v1Raw(fullEvents()) });
    const repo = learnerRepo(storage);
    assert.equal(repo.read().storageIssue, issue);
    assert.equal(repo.read().events.length, 0, "a bad v2 record is not silently replaced by v1 data");
    const ok = repo.append(fullEvents()[0]);
    assert.equal(ok, false);
    assert.equal(storage.getItem(PROGRESS_STORAGE_KEY), raw, "left exactly as found");
    repo.reset();
    assert.equal(storage.getItem(PROGRESS_STORAGE_KEY), null);
    assert.equal(storage.getItem(LEGACY_PROGRESS_STORAGE_KEY), null, "reset clears v1 too, so nothing resurrects");
    assert.equal(learnerRepo(storage).read().storageIssue, undefined);
  }
});

test("events from a newer version are kept on write; malformed attempts are ignored", () => {
  const future = { id: "f1", type: "hint.revealed", itemId: "data-lab.challenge-1", tier: 2 };
  const badAttempt = { id: "b1", type: "challenge.attempted", itemId: "data-lab.challenge-1", attempt: 0, outcome: "nope" };
  const storage = createMemoryStorage({ [PROGRESS_STORAGE_KEY]: JSON.stringify({ schemaVersion: 2, learnerId: "x", events: [future, badAttempt] }) });
  const repo = learnerRepo(storage);
  assert.equal(repo.read().events.length, 0);
  const at = buildAttempt(repo.read(), catalog, { challengeId: "data-lab.challenge-1", outcome: "passed", failedCheckIds: [], activeMs: 1, checkIds: [] });
  assert.ok(at.ok);
  repo.append(at.event);
  const stored = JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY)!).events;
  assert.deepEqual(stored.slice(0, 2), [future, badAttempt]);
  assert.equal(stored.length, 3);
});

test("attempts: sequence numbers, failed checks, outcomes, persistence, and no duplicate XP", () => {
  const storage = createMemoryStorage();
  const repo = learnerRepo(storage);
  const def = validatorForChallenge("data-lab.challenge-1")!;
  const checkIds = def.checks.map((c) => c.id);
  const add = (outcome: ChallengeAttemptedEvent["outcome"], failed: string[] = []) => {
    const r = buildAttempt(repo.read(), catalog, { challengeId: def.challengeId, outcome, failedCheckIds: failed, activeMs: 2500.4, checkIds });
    assert.ok(r.ok);
    repo.append(r.event);
    return r.event;
  };
  const a1 = add("failed", ["unseen", "unseen", "not-a-check"]);
  assert.equal(a1.attempt, 1);
  assert.deepEqual(a1.failedCheckIds, ["unseen"], "deduplicated, unknown ids dropped");
  assert.equal(a1.activeMs, 2500);
  assert.equal(add("syntax-error", ["unseen"]).failedCheckIds.length, 0, "error outcomes carry no failed checks");
  assert.equal(add("passed").attempt, 3);
  // A completion is recorded once; a repeat pass adds an attempt but no XP.
  const receipt = { validatorId: def.validatorId, verdict: "passed" as const, checkedAt: "t" };
  const c1 = submitCompletion(repo.read(), catalog, ACTIVE_VALIDATORS, { itemId: def.challengeId, receipt });
  assert.ok(c1.ok);
  repo.append(c1.event);
  add("passed");
  const c2 = submitCompletion(repo.read(), catalog, ACTIVE_VALIDATORS, { itemId: def.challengeId, receipt });
  assert.ok(!c2.ok && c2.reason === "duplicate");
  // Survives a "refresh" (a new repository over the same storage).
  const reloaded = learnerRepo(storage).read();
  assert.deepEqual(attemptsFor(reloaded, def.challengeId).map((a) => a.outcome), ["failed", "syntax-error", "passed", "passed"]);
  assert.equal(deriveProgress(reloaded, catalog).totalXp, catalog.getItem(def.challengeId)!.xp);
  // Lessons are not challenges.
  const bad = buildAttempt(reloaded, catalog, { challengeId: "data-lab.lesson-1", outcome: "passed", failedCheckIds: [], activeMs: 0, checkIds: [] });
  assert.ok(!bad.ok && bad.reason === "not-a-challenge");
});

test("grading results map onto attempt evidence; R being unavailable records nothing", () => {
  const checks = [{ id: "a", description: "", hint: "", passed: true }, { id: "b", description: "", hint: "", passed: false }];
  assert.deepEqual(evidenceFromEvaluation({ status: "failed", checks }), { outcome: "failed", failedCheckIds: ["b"] });
  assert.equal(evidenceFromEvaluation({ status: "passed", checks })?.outcome, "passed");
  assert.equal(evidenceFromEvaluation({ status: "error", kind: "syntax", message: "", checks })?.outcome, "syntax-error");
  assert.deepEqual(evidenceFromEvaluation({ status: "error", kind: "runtime", message: "", checks }), { outcome: "runtime-error", failedCheckIds: [] });
  assert.equal(evidenceFromEvaluation({ status: "timeout", message: "" })?.outcome, "timeout");
  assert.equal(evidenceFromEvaluation({ status: "integrity", message: "" })?.outcome, "integrity");
  assert.equal(evidenceFromEvaluation({ status: "runtime-error", message: "R could not start" }), null);
});

test("active time counts only attended, non-idle time", () => {
  const m = new ActiveTimeMeter(0);
  m.input(0, true);
  for (let t = 1000; t <= 10_000; t += 1000) m.tick(t, true);
  assert.equal(m.take(10_000, true), 10_000);
  for (let t = 11_000; t <= 15_000; t += 1000) m.tick(t, false); // tab hidden
  assert.equal(m.take(15_000, false), 0);
  m.input(15_000, true);
  for (let t = 16_000; t <= 15_000 + IDLE_AFTER_MS + 30_000; t += 1000) m.tick(t, true); // no input: idle after 60 s
  assert.equal(m.take(15_000 + IDLE_AFTER_MS + 30_000, true), IDLE_AFTER_MS);
  m.input(200_000, true);
  m.tick(10_000_000, true); // laptop asleep: one long gap counts at most 5 s
  assert.ok(m.take(10_000_000, true) <= 5_000);
});

/* --------------------- Milestone 4A: skills and learning insights --------------------- */

import { CHECK_SKILLS, SKILLS } from "../content/skills.ts";
import { deriveInsights } from "../features/insights/derive-insights.ts";

test("every validator check has exactly one known skill tag", () => {
  const ids = new Set(SKILLS.map((s) => s.id));
  let n = 0;
  for (const v of VALIDATORS) {
    const tags = CHECK_SKILLS[v.challengeId];
    assert.ok(tags, `${v.challengeId} untagged`);
    assert.deepEqual(Object.keys(tags).sort(), v.checks.map((c) => c.id).sort(), `${v.challengeId} tags match its checks`);
    for (const t of Object.values(tags)) assert.ok(ids.has(t), `${v.challengeId}: unknown skill ${t}`);
    n += v.checks.length;
  }
  assert.equal(n, 88);
  const used = new Set(Object.values(CHECK_SKILLS).flatMap((t) => Object.values(t)));
  assert.deepEqual([...used].sort(), [...ids].sort(), "every skill is used");
});

test("insights come only from recorded attempts; earlier completions are kept apart", () => {
  const empty = deriveInsights(emptySnapshot(), catalog);
  assert.equal(empty.attempts, 0);
  assert.equal(empty.practice.length, 0);
  assert.equal(empty.firstTry.of, 0);

  // A migrated learner: completions only, no attempts.
  const legacy = deriveInsights({ ...emptySnapshot(), events: fullEvents() }, catalog);
  assert.equal(legacy.attempts, 0);
  assert.equal(legacy.challengesAttempted, 0);
  assert.equal(legacy.earlierCompletions, 15);

  let snap = emptySnapshot();
  const add = (challengeId: string, outcome: ChallengeAttemptedEvent["outcome"], failed: string[] = []) => {
    const def = validatorForChallenge(challengeId)!;
    const r = buildAttempt(snap, catalog, { challengeId, outcome, failedCheckIds: failed, activeMs: 60_000, checkIds: def.checks.map((c) => c.id) });
    assert.ok(r.ok);
    snap = { ...snap, events: [...snap.events, r.event] };
  };
  add("data-lab.challenge-1", "passed"); // first try
  add("data-lab.challenge-2", "failed", ["missing", "values"]);
  add("data-lab.challenge-2", "syntax-error");
  add("data-lab.challenge-2", "failed", ["missing"]);
  add("data-lab.challenge-2", "passed");
  add("data-lab.boss", "failed", ["dates", "types"]); // still unsolved
  const i = deriveInsights(snap, catalog);
  assert.equal(i.attempts, 6);
  assert.equal(i.challengesAttempted, 3);
  assert.equal(i.challengesSolved, 2);
  assert.deepEqual(i.firstTry, { passed: 1, of: 3 });
  assert.equal(i.outcomes["syntax-error"], 1);
  assert.equal(i.activeMs, 6 * 60_000);
  assert.deepEqual(i.topFailedChecks[0], {
    challengeId: "data-lab.challenge-2",
    challengeTitle: "Summarise by treatment arm",
    checkId: "missing",
    description: validatorForChallenge("data-lab.challenge-2")!.checks.find((c) => c.id === "missing")!.description,
    skill: "missing-values",
    count: 2,
  });
  // types-and-dates fails on an unsolved boss → first; missing-values failed in 2 attempts → listed too.
  assert.equal(i.practice[0].skill, "types-and-dates");
  assert.equal(i.practice[0].challengeId, "data-lab.boss");
  assert.equal(i.practice[0].lessonId, "data-lab.lesson-3", "links the lesson that prepares that challenge");
  assert.ok(i.practice.some((p) => p.skill === "missing-values" && p.lessonId === "data-lab.lesson-2"));
  assert.ok(!i.practice.some((p) => p.skill === "summaries"), "one failure on a solved challenge isn't a weak spot");
});
