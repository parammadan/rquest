// World 2 (Package Factory) learning experience: video, diagrams, evolving walkthroughs,
// wrong-answer feedback, rewards, assembly progression, boss briefing, XP integrity.
// Usage: pnpm build:pages && pnpm test:e2e:world2   (SITE_URL=… for production; SHOTS=1 for screenshots)
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { catalog } from "../src/content/catalog.ts";
import { startSite } from "./lib/site.mjs";

const PORT = 3116;
const KEY = "rquest:progress:v1";
const SHOTS = process.env.SHOTS === "1";
const SHOT_DIR = new URL("../docs/screenshots/", import.meta.url).pathname;
if (SHOTS) mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
let failures = 0;
async function check(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push(`  ✔ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    failures++;
    results.push(`  ✘ ${name}\n      ${String(e?.message ?? e).split("\n")[0]}`);
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m);
};

const site = await startSite(PORT);
const BASE = site.base;
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const events = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{"events":[]}').events, KEY);
const W2 = `${BASE}/academy/missions/package-factory`;
const lessons = [1, 2, 3].map((n) => catalog.getItem(`package-factory.lesson-${n}`));

async function answerAll(lesson) {
  for (const [qi, q] of lesson.knowledgeCheck.entries()) {
    await page.getByRole("radiogroup", { name: `Question ${qi + 1} options` }).getByRole("radio").nth(q.options.findIndex((o) => o.id === q.correctOptionId)).click();
  }
}

try {
  // A learner who cleared World 1 before Phase 3B (challenges only, no lessons).
  await page.goto(`${BASE}/`);
  await page.evaluate((k) => {
    const events = ["challenge-1", "challenge-2", "boss"].map((slug) => ({
      id: `legacy-${slug}`, type: "item.completed", itemId: `data-lab.${slug}`, itemKind: "challenge", missionId: "data-lab",
      occurredAt: "2026-11-01T00:00:00.000Z",
      receipt: { validatorId: `webr:output-match:data-lab.${slug}`, verdict: "passed", checkedAt: "2026-11-01T00:00:00.000Z" },
    }));
    localStorage.setItem(k, JSON.stringify({ schemaVersion: 1, learnerId: "e2e", events }));
  }, KEY);

  await check("legacy World 1 progress unlocks World 2; mission shows the assembly line and live lessons", async () => {
    await page.goto(`${W2}/`);
    await page.getByRole("heading", { name: /labtools assembly line/ }).waitFor();
    assert((await page.locator("#assembly-h").locator("..").innerText()).includes("3/7 assembled"), "3/7 assembled");
    const tl = await page.getByRole("list", { name: "Lessons and challenges" }).innerText();
    assert((tl.match(/LIVE/gi) ?? []).length === 6, "6 live items");
    if (SHOTS) await page.screenshot({ path: SHOT_DIR + "26-w2-mission.png", fullPage: true });
  });

  await check("Lesson 1: video plays Video 2 with captions; chapters seek; transcript has every cue", async () => {
    await page.goto(`${W2}/lessons/package-factory.lesson-1/`);
    await page.getByRole("button", { name: /Begin lesson/ }).click();
    await page.waitForFunction(() => document.querySelector("[data-testid=lesson-video]")?.readyState >= 1, null, { timeout: 30_000 });
    const v = page.getByTestId("lesson-video");
    const info = await v.evaluate((el) => ({ d: el.duration, src: el.currentSrc, mode: el.textTracks[0]?.mode }));
    assert(info.d > 270 && info.d < 277 && info.src.endsWith("/media/package-factory-v1.mp4") && info.mode === "showing", JSON.stringify(info));
    await page.getByRole("button", { name: /Exports and the NAMESPACE/ }).click();
    await page.waitForTimeout(700);
    const t = await v.evaluate((el) => el.currentTime);
    const chapter = (await import("../src/content/videos/package-factory-v1.generated.ts")).generated.chapters.find((c) => c.id === "exports");
    assert(Math.abs(t - chapter.startSec) < 2, `seek to ${chapter.startSec}, got ${t}`);
    await page.getByRole("tab", { name: "Transcript" }).click();
    assert((await page.getByRole("list", { name: "Transcript" }).locator("li").count()) === 57, "57 cues");
    await page.getByRole("list", { name: "Transcript" }).getByRole("button").nth(20).click();
    await page.waitForTimeout(400);
    assert(Math.abs((await v.evaluate((el) => el.currentTime)) - (await import("../src/content/videos/package-factory-v1.generated.ts")).generated.transcript[20].startSec) < 1, "transcript click seeks");
    if (SHOTS) {
      await v.evaluate((el) => el.pause());
      await page.screenshot({ path: SHOT_DIR + "27-w2-video.png" });
    }
  });

  await check("Lesson 1 Learn: file tree, live R example, walkthrough code evolves", async () => {
    await page.getByRole("button", { name: "Continue to Learn" }).click();
    await page.getByRole("figure", { name: "File structure: labtools/" }).waitFor();
    await page.getByRole("button", { name: "Run in R" }).first().click();
    await page.getByText("Your run").first().waitFor({ timeout: 120_000 });
    const out = await page.locator("main figure").filter({ hasText: "Your run" }).first().innerText();
    assert(out.includes("TRUE") && out.includes('"csv"'), out.slice(-120));
    const codeOf = () => page.getByRole("region", { name: /format_pvalue/ }).or(page.locator("section[aria-labelledby=walkthrough-h] pre")).first().innerText();
    const before = await codeOf();
    await page.getByRole("button", { name: "Next step" }).click();
    await page.waitForTimeout(700);
    const after = await codeOf();
    assert(before.includes("@export") && before !== after && !after.split("\n")[0].includes("@export"), "code changed in step 2");
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Next step" }).click();
    await page.waitForTimeout(600);
    assert((await page.locator("section[aria-labelledby=walkthrough-h]").innerText()).includes('"< 0.001" "0.021"'), "final output");
    if (SHOTS) await page.screenshot({ path: SHOT_DIR + "28-w2-learn.png", fullPage: true });
  });

  await check("Lesson 1 Check: a wrong answer explains itself; correct answers complete with the reward", async () => {
    await page.getByRole("button", { name: /Take the knowledge check/ }).click();
    const q = lessons[0].knowledgeCheck[0];
    const wrong = q.options.find((o) => o.id !== q.correctOptionId);
    await page.getByRole("radiogroup", { name: "Question 1 options" }).getByRole("radio").nth(q.options.indexOf(wrong)).click();
    await page.getByText(wrong.feedback).waitFor();
    if (SHOTS) await page.screenshot({ path: SHOT_DIR + "29-w2-feedback.png" });
    await answerAll(lessons[0]);
    await page.getByRole("button", { name: /Complete lesson/ }).click();
    await page.getByText(lessons[0].reward.title).waitFor();
    assert(await page.getByText("+20 XP").isVisible(), "+20 XP");
    assert(await page.getByRole("link", { name: /Continue to the challenge: Export the right functions/ }).isVisible(), "challenge CTA");
    if (SHOTS) {
      await page.waitForTimeout(1200);
      await page.screenshot({ path: SHOT_DIR + "30-w2-reward.png" });
    }
  });

  await check("Lessons 2 and 3: dependency map renders; both complete; tests part assembles", async () => {
    for (const [i, l] of lessons.slice(1).entries()) {
      await page.goto(`${W2}/lessons/${l.id}/`);
      await page.getByRole("button", { name: "Learn", exact: true }).click();
      if (i === 0) await page.getByRole("figure", { name: "One dependency, declared twice" }).waitFor();
      await page.getByRole("button", { name: "Check", exact: true }).click();
      await answerAll(l);
      await page.getByRole("button", { name: /Complete lesson/ }).click();
      await page.getByText(l.reward.title).waitFor();
    }
    await page.goto(`${W2}/`);
    await page.getByRole("heading", { name: /labtools assembly line/ }).waitFor();
    assert((await page.locator("#assembly-h").locator("..").innerText()).includes("4/7 assembled"), "4/7 after lesson 3");
  });

  await check("XP integrity: 260 legacy + 3 × 20 lesson XP, each lesson recorded once", async () => {
    const ev = await events();
    const lessonEvents = ev.filter((e) => e.itemKind === "lesson");
    assert(lessonEvents.length === 3 && new Set(lessonEvents.map((e) => e.itemId)).size === 3, `lesson events ${lessonEvents.length}`);
    await page.goto(`${BASE}/academy/progress/`);
    await page.waitForFunction(() => /^\s*\d/.test(document.querySelector('section[aria-label="Totals"]')?.innerText ?? ""));
    const totals = await page.locator('section[aria-label="Totals"]').innerText();
    assert(totals.startsWith("320"), totals.slice(0, 30));
    await page.goto(`${W2}/lessons/package-factory.lesson-1/`);
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await answerAll(lessons[0]);
    await page.getByRole("button", { name: /Complete lesson/ }).click();
    await page.getByText(/Already completed: no additional XP/).waitFor();
    assert((await events()).length === ev.length, "no new event on repeat");
  });

  await check("boss workspace opens with the release briefing; it collapses into the build", async () => {
    await page.goto(`${W2}/challenges/package-factory.boss/`);
    await page.getByRole("heading", { name: "Release day: labtools 0.1.0" }).waitFor();
    assert(await page.getByText("Exactly two exports").isVisible(), "gates");
    if (SHOTS) {
      await page.waitForTimeout(1200);
      await page.screenshot({ path: SHOT_DIR + "31-w2-boss-briefing.png" });
    }
    await page.getByRole("button", { name: "Start the build" }).click();
    await page.getByRole("button", { name: /Show boss briefing/ }).waitFor();
    assert((await page.locator(".cm-content").count()) === 1, "editor present");
  });

  await check("World 1 lessons unaffected: still complete normally", async () => {
    const l = catalog.getItem("data-lab.lesson-2");
    await page.goto(`${BASE}/academy/missions/data-lab/lessons/data-lab.lesson-2/`);
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await answerAll(l);
    await page.getByRole("button", { name: /Complete lesson/ }).click();
    await page.getByText("+20 XP").waitFor();
  });

  await check("mobile: World 2 mission and lesson pages don't overflow", async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mp = await m.newPage();
    await mp.goto(`${BASE}/`);
    await mp.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, await page.evaluate((k) => localStorage.getItem(k), KEY)]);
    for (const path of ["/", "/academy/missions/package-factory/lessons/package-factory.lesson-2/", "/academy/missions/package-factory/challenges/package-factory.boss/"]) {
      await mp.goto(BASE + path.replace(/^\/$/, "/academy/missions/package-factory/"));
      await mp.waitForTimeout(600);
      if (path.includes("lesson-2")) await mp.getByRole("button", { name: "Learn", exact: true }).click();
      const [sw, iw] = await mp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      assert(sw <= iw, `${path}: ${sw} > ${iw}`);
    }
    if (SHOTS) await mp.screenshot({ path: SHOT_DIR + "32-w2-mobile.png" });
    await m.close();
  });

  await check("no uncaught page errors", async () => {
    assert(errors.length === 0, errors.join(" | "));
  });
} finally {
  await browser.close();
  site.stop();
}
console.log(results.join("\n"));
console.log(failures ? `\n${failures} check(s) failed` : `\nAll ${results.length} checks passed`);
process.exit(failures ? 1 : 0);
