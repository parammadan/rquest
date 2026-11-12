// Phase 3A lesson experience checks (video, transcript, live R, knowledge check, completion rules).
// Usage: pnpm build:pages && pnpm test:e2e:lessons   (SITE_URL=… to test a deployed site; SHOTS=1 for screenshots)
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { catalog } from "../src/content/catalog.ts";
import { startSite } from "./lib/site.mjs";

const PORT = 3115;
const KEY = "rquest:progress:v2";
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
const events = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{"events":[]}').events.length, KEY);
const lesson1 = catalog.getItem("data-lab.lesson-1");
const L1 = `${BASE}/academy/missions/data-lab/lessons/data-lab.lesson-1/`;

async function answerAll(lesson) {
  for (const [qi, q] of lesson.knowledgeCheck.entries()) {
    const group = page.getByRole("radiogroup", { name: `Question ${qi + 1} options` });
    await group.getByRole("radio").nth(q.options.findIndex((o) => o.id === q.correctOptionId)).click();
  }
}

try {
  await check("mission page lists live lessons; Start lesson opens the briefing", async () => {
    await page.goto(`${BASE}/academy/missions/data-lab/`);
    await page.getByRole("link", { name: /Start lesson/ }).waitFor();
    await page.getByRole("link", { name: /Start lesson/ }).click();
    await page.getByRole("heading", { name: lesson1.title }).waitFor();
    assert(await page.getByRole("region", { name: "Mission briefing" }).isVisible(), "briefing");
    if (SHOTS) {
      await page.waitForTimeout(1200);
      await page.screenshot({ path: SHOT_DIR + "20-lesson-briefing.png" });
    }
  });

  await check("video loads with captions track; playback starts at the lesson's first chapter", async () => {
    await page.getByRole("button", { name: /Begin lesson/ }).click();
    const video = page.getByTestId("lesson-video");
    await video.waitFor();
    await page.waitForFunction(() => document.querySelector("[data-testid=lesson-video]")?.readyState >= 1, null, { timeout: 30_000 });
    const info = await video.evaluate((v) => ({ d: v.duration, tracks: v.textTracks.length, mode: v.textTracks[0]?.mode, src: v.currentSrc }));
    assert(info.d > 180 && info.d < 200, `duration ${info.d}`);
    assert(info.tracks === 1 && info.mode === "showing", `tracks ${info.tracks} ${info.mode}`);
    assert(info.src.endsWith("/media/data-lab-v1.mp4"), info.src);
  });

  await check("chapters seek the video; transcript follows the current time", async () => {
    await page.getByRole("button", { name: /Missing observations/ }).click();
    await page.waitForTimeout(800);
    const t = await page.getByTestId("lesson-video").evaluate((v) => v.currentTime);
    assert(t > 75 && t < 80, `currentTime ${t}`);
    await page.getByRole("tab", { name: "Transcript" }).click();
    // Inside the chapter's narration (chapters open 0.6 s before the voice starts).
    await page.getByTestId("lesson-video").evaluate((v) => { v.pause(); v.currentTime = 80; });
    await page.waitForTimeout(500);
    const cues = page.getByRole("list", { name: "Transcript" }).locator("li");
    assert((await cues.count()) === 45, `cues ${await cues.count()}`);
    const active = await page.locator('[aria-label="Transcript"] button.bg-violet\\/10').innerText();
    assert(/missing|NA|gaps/i.test(active), `active cue: ${active}`);
    if (SHOTS) {
      await page.getByTestId("lesson-video").evaluate((v) => v.pause());
      await page.waitForTimeout(400);
      await page.screenshot({ path: SHOT_DIR + "21-lesson-video.png" });
    }
  });

  await check("captions can be toggled", async () => {
    await page.getByRole("button", { name: /Captions on/ }).click();
    assert((await page.getByTestId("lesson-video").evaluate((v) => v.textTracks[0].mode)) === "hidden", "hidden");
    await page.getByRole("button", { name: /Captions off/ }).click();
    assert((await page.getByTestId("lesson-video").evaluate((v) => v.textTracks[0].mode)) === "showing", "showing");
  });

  await check("opening and watching does not complete the lesson", async () => {
    assert((await events()) === 0, "no events");
    assert(await page.getByText("Complete the check to finish").isVisible(), "not completed");
  });

  await check("Learn: example code runs in real R; walkthrough steps through the code", async () => {
    await page.getByRole("button", { name: "Continue to Learn" }).click();
    await page.getByRole("button", { name: "Run in R" }).first().click();
    await page.getByText("Your run").first().waitFor({ timeout: 120_000 });
    const out = await page.locator("main figure").first().innerText();
    assert(out.includes('"character"') && out.includes("[1] 6"), out.slice(-200));
    const lig = await page.locator("main pre").first().evaluate((el) => getComputedStyle(el).fontVariantLigatures);
    assert(lig === "none", `code ligatures must be off (got ${lig})`);
    const steps = lesson1.walkthrough.steps.length;
    for (let i = 1; i < steps; i++) await page.getByRole("button", { name: "Next step" }).click();
    assert(await page.getByText(`Step ${steps} of ${steps}`).isVisible(), `step ${steps}`);
    if (SHOTS) await page.screenshot({ path: SHOT_DIR + "22-lesson-learn.png" });
  });

  await check("knowledge check: wrong answer gives feedback, can't complete, no XP", async () => {
    await page.getByRole("button", { name: /Take the knowledge check/ }).click();
    const q = lesson1.knowledgeCheck[0];
    const wrongIdx = q.options.findIndex((o) => o.id !== q.correctOptionId);
    await page.getByRole("radiogroup", { name: "Question 1 options" }).getByRole("radio").nth(wrongIdx).click();
    await page.getByText(/Not quite/).waitFor();
    assert(await page.getByRole("button", { name: /Complete lesson/ }).isDisabled(), "disabled");
    assert((await events()) === 0, "no events");
  });

  await check("all correct → completion animation, +20 XP, recorded once", async () => {
    await answerAll(lesson1);
    await page.getByText(/3 of 3 correct/).waitFor();
    if (SHOTS) await page.screenshot({ path: SHOT_DIR + "23-lesson-check.png", fullPage: true });
    await page.getByRole("button", { name: /Complete lesson/ }).click();
    await page.getByRole("heading", { name: "Lesson complete" }).waitFor();
    assert(await page.getByText("+20 XP").isVisible(), "+20");
    assert(await page.getByRole("link", { name: /Continue to the challenge: Clean the site codes/ }).isVisible(), "challenge CTA");
    assert((await events()) === 1, "one event");
    if (SHOTS) {
      await page.waitForTimeout(1300);
      await page.screenshot({ path: SHOT_DIR + "24-lesson-complete.png" });
    }
  });

  await check("completion persists across reload; repeating awards no XP", async () => {
    await page.goto(L1);
    await page.getByText("Lesson completed").waitFor();
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await answerAll(lesson1);
    await page.getByRole("button", { name: /Complete lesson/ }).click();
    await page.getByText(/Already completed: no additional XP/).waitFor();
    assert((await events()) === 1, "still one event");
  });

  await check("progress: 20 XP, 1/15 lessons, World 1 not cleared by lessons", async () => {
    await page.goto(`${BASE}/academy/progress/`);
    await page.waitForFunction(() => /^\s*\d/.test(document.querySelector('section[aria-label="Totals"]')?.innerText ?? ""));
    const totals = await page.locator('section[aria-label="Totals"]').innerText();
    assert(totals.startsWith("20") && totals.includes("1 / 15"), totals.slice(0, 60));
    assert(await page.getByRole("list", { name: "How progress works" }).isVisible(), "legend");
    await page.goto(`${BASE}/academy/missions/package-factory/`);
    await page.getByRole("heading", { name: /is locked/ }).waitFor();
  });

  await check("video failure falls back gracefully (transcript still available)", async () => {
    const p2 = await ctx.newPage();
    await p2.route("**/media/*.mp4", (r) => r.fulfill({ status: 404, body: "" }));
    await p2.goto(L1);
    await p2.getByRole("button", { name: "Watch", exact: true }).click();
    await p2.getByText(/couldn.t be loaded/).waitFor({ timeout: 20_000 });
    await p2.getByRole("tab", { name: "Transcript" }).click();
    assert((await p2.getByRole("list", { name: "Transcript" }).locator("li").count()) === 45, "transcript");
    await p2.close();
  });

  await check("mobile: lesson page has no horizontal overflow", async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mp = await m.newPage();
    for (const stage of ["Briefing", "Watch", "Learn", "Check"]) {
      await mp.goto(L1);
      await mp.getByRole("button", { name: stage, exact: true }).click();
      await mp.waitForTimeout(500);
      const [sw, iw] = await mp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      assert(sw <= iw, `${stage}: ${sw} > ${iw}`);
    }
    if (SHOTS) await mp.screenshot({ path: SHOT_DIR + "25-lesson-mobile.png" });
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
