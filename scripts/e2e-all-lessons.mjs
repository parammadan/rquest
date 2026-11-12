// Every live lesson, end to end: its world unlocks from challenge progress, its video
// loads at the right chapter, a live R example runs, a wrong answer explains itself,
// and a correct check completes it once (+20 XP).
// Usage: pnpm build:pages && pnpm test:e2e:all-lessons   (SITE_URL=… for production)
import { chromium } from "playwright-core";
import { catalog } from "../src/content/catalog.ts";
import { getDebrief, getVideo } from "../src/content/videos.ts";
import { expectedValidatorId } from "../src/domain/progression.ts";
import { startSite } from "./lib/site.mjs";

const KEY = "rquest:progress:v2";
const site = await startSite(3121);
const BASE = site.base;
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio"] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const results = [];
let failures = 0;
const assert = (c, m) => {
  if (!c) throw new Error(m);
};

// Challenge-only progress for every world, so every world is unlocked (the Phase 2 "legacy" learner).
const challengeEvents = catalog.missions.flatMap((m) =>
  m.items.filter((i) => i.kind === "challenge").map((i, n) => ({
    id: `legacy-${i.id}`, type: "item.completed", itemId: i.id, itemKind: "challenge", missionId: m.id,
    occurredAt: new Date(Date.UTC(2026, 10, 1, 0, n)).toISOString(),
    receipt: { validatorId: expectedValidatorId(i), verdict: "passed", checkedAt: "2026-11-01T00:00:00.000Z" },
  })),
);
await page.goto(`${BASE}/`);
await page.evaluate(([k, ev]) => localStorage.setItem(k, JSON.stringify({ schemaVersion: 1, learnerId: "e2e", events: ev })), [KEY, challengeEvents]);
const events = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)).events, KEY);

const live = catalog.missions.flatMap((m) => m.items).filter((i) => i.kind === "lesson" && i.availability.status === "available");
for (const lesson of live) {
  const t0 = Date.now();
  try {
    const video = getVideo(lesson.videoId);
    const startAt = video.chapters.find((c) => lesson.chapterIds.includes(c.id)).startSec;
    await page.goto(`${BASE}/academy/missions/${lesson.missionId}/lessons/${lesson.id}/`);
    await page.getByRole("button", { name: "Watch", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("[data-testid=lesson-video]")?.readyState >= 1, null, { timeout: 30_000 });
    const v = await page.getByTestId("lesson-video").evaluate((el) => ({ d: el.duration, t: el.currentTime, src: el.currentSrc }));
    assert(Math.abs(v.d - video.durationSec) < 1.5, `duration ${v.d} vs ${video.durationSec}`);
    assert(Math.abs(v.t - startAt) < 1.5, `starts at ${v.t}, expected ${startAt}`);
    assert(v.src.endsWith(video.sources.mp4.split("/").pop()), v.src);
    await page.getByRole("button", { name: "Learn", exact: true }).click();
    if (lesson.explanation.some((b) => b.kind === "code" && b.runnable)) {
      await page.getByRole("button", { name: "Run in R" }).first().click();
      await page.getByText("Your run").first().waitFor({ timeout: 120_000 });
      const out = await page.locator("main figure").filter({ hasText: "Your run" }).first().innerText();
      assert(!/Error:/.test(out), `R example errored: ${out.slice(-160)}`);
    }
    await page.getByRole("button", { name: "Check", exact: true }).click();
    const q = lesson.knowledgeCheck[0];
    const wrong = q.options.find((o) => o.id !== q.correctOptionId);
    await page.getByRole("radiogroup", { name: "Question 1 options" }).getByRole("radio").nth(q.options.indexOf(wrong)).click();
    await page.getByText(wrong.feedback).waitFor();
    for (const [qi, qq] of lesson.knowledgeCheck.entries()) {
      await page.getByRole("radiogroup", { name: `Question ${qi + 1} options` }).getByRole("radio").nth(qq.options.findIndex((o) => o.id === qq.correctOptionId)).click();
    }
    const before = (await events()).length;
    await page.getByRole("button", { name: /Complete lesson/ }).click();
    await page.getByText("+20 XP").waitFor();
    const after = await events();
    assert(after.length === before + 1 && after.at(-1).itemId === lesson.id, "exactly one new event for this lesson");
    results.push(`  ✔ ${lesson.id} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    failures++;
    results.push(`  ✘ ${lesson.id}\n      ${String(e?.message ?? e).split("\n")[0]}`);
  }
}
const finalEvents = await events();
const lessonXp = finalEvents.filter((e) => e.itemKind === "lesson").length * 20;
results.push(`  ${lessonXp === live.length * 20 ? "✔" : "✘"} total lesson XP ${lessonXp} for ${live.length} lessons`);
if (lessonXp !== live.length * 20) failures++;
// Boss debriefs: cleared bosses (all of them, for this learner) show the debrief's real status,
// and a learner who hasn't cleared the boss sees it locked.
const fresh = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
for (const m of catalog.missions) {
  const boss = m.items.find((i) => i.kind === "challenge" && i.type === "boss");
  const url = `${BASE}/academy/missions/${m.id}/challenges/${boss.id}/`;
  try {
    await page.goto(url);
    const want = getDebrief(m.id).status;
    await page.waitForFunction((w) => document.querySelector("[data-testid=boss-debrief]")?.dataset.state === w, want, { timeout: 30_000 });
    if (want === "ready") {
      await page.waitForFunction(() => document.querySelector("[data-testid=boss-debrief] video")?.readyState >= 1, null, { timeout: 30_000 });
      const d = await page.locator("[data-testid=boss-debrief] video").evaluate((el) => el.duration);
      assert(Math.abs(d - getDebrief(m.id).durationSec) < 1.5, `debrief duration ${d}`);
    }
    await fresh.goto(url);
    await fresh.locator("main h1").first().waitFor({ timeout: 30_000 });
    await fresh.waitForTimeout(500);
    const locked = await fresh.locator("[data-testid=boss-debrief]").count();
    if (m.id === "data-lab") assert(locked === 1, "World 1 boss shows the locked debrief");
    if (locked) assert((await fresh.getAttribute("[data-testid=boss-debrief]", "data-state")) === "locked", "fresh learner sees it locked");
    assert((await fresh.locator("[data-testid=boss-debrief] video").count()) === 0, "no video for a fresh learner");
    // The mission page's boss preview mentions the debrief: "unlocked" when cleared, a promise otherwise.
    await page.goto(`${BASE}/academy/missions/${m.id}/`);
    await page.getByRole("button", { name: new RegExp(`Boss mission: ${boss.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }).click();
    await page.getByTestId("debrief-note").filter({ hasText: "Debrief video unlocked" }).waitFor({ timeout: 15_000 });
    if (m.id === "data-lab") {
      await fresh.goto(`${BASE}/academy/missions/data-lab/`);
      await fresh.getByRole("button", { name: /Boss mission:/ }).click();
      await fresh.getByTestId("debrief-note").filter({ hasText: "Clearing this boss unlocks" }).waitFor({ timeout: 15_000 });
    }
    results.push(`  ✔ ${m.id} debrief: ${want} when cleared, locked otherwise; mission page mentions it`);
  } catch (e) {
    failures++;
    results.push(`  ✘ ${m.id} debrief\n      ${String(e?.message ?? e).split("\n")[0]}`);
  }
}

if (errors.length) {
  failures++;
  results.push(`  ✘ page errors: ${errors.join(" | ")}`);
}
await browser.close();
site.stop();
console.log(results.join("\n"));
console.log(failures ? `\n${failures} failure(s)` : `\nAll ${live.length} live lessons passed`);
process.exit(failures ? 1 : 0);
