// Cross-browser smoke test: Chromium (system Chrome), Firefox, and WebKit (Safari's engine).
// Covers navigation, webR start-up and execution, validation, persistence, video, captions,
// transcript seeking, and a phone-sized layout.
// Usage: pnpm build:pages && pnpm test:browsers   (SITE_URL=… for production)
import { chromium, firefox, webkit } from "playwright-core";
import { REFERENCE_SOLUTIONS } from "../src/content/validators/reference-solutions.ts";
import { startSite } from "./lib/site.mjs";

const KEY = "rquest:progress:v1";
const site = await startSite(3117);
const BASE = site.base;
const engines = [
  ["chromium (Chrome)", () => chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio"] })],
  ["firefox", () => firefox.launch({ headless: true, firefoxUserPrefs: { "media.autoplay.default": 0, "media.volume_scale": "0.0" } })],
  ["webkit (Safari engine)", () => webkit.launch({ headless: true })],
];
const summary = [];
let failures = 0;

for (const [name, launch] of engines) {
  const rows = [];
  let browser;
  try {
    browser = await launch();
  } catch (e) {
    summary.push(`${name}: NOT TESTED (${String(e.message).split("\n")[0]})`);
    continue;
  }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  let current = "";
  page.on("pageerror", (e) => errors.push(`[${current}] ${String(e)}`));
  const step = async (label, fn) => {
    current = label;
    const t0 = Date.now();
    try {
      await fn();
      rows.push(`    ✔ ${label} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    } catch (e) {
      failures++;
      rows.push(`    ✘ ${label}: ${String(e?.message ?? e).split("\n")[0]}`);
    }
  };
  const assert = (c, m) => {
    if (!c) throw new Error(m);
  };

  await step("landing → Start Learning → dashboard → map", async () => {
    await page.goto(`${BASE}/`);
    await page.getByRole("link", { name: /Start Learning/ }).first().click();
    await page.getByRole("heading", { name: /Welcome to the academy/ }).waitFor();
    await page.locator('aside nav[aria-label="Academy"]').getByRole("link", { name: "Mission Map" }).click();
    await page.getByRole("heading", { name: /Five worlds/ }).waitFor();
    await page.locator('.hidden.md\\:block [role="group"] button').nth(2).click();
    await page.getByRole("heading", { name: "Debugging Crisis" }).waitFor();
  });

  await step("webR starts and runs R code", async () => {
    await page.goto(`${BASE}/academy/missions/data-lab/challenges/data-lab.challenge-1/`);
    await page.locator(".cm-content").waitFor();
    await page.locator(".cm-content").click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Delete");
    await page.keyboard.insertText("sum(1:10)\nR.version.string");
    await page.getByRole("button", { name: /^Run$/ }).click();
    await page.waitForFunction(() => /\[1\] 55/.test(document.querySelector('[role="log"]')?.textContent ?? ""), null, { timeout: 180_000 });
  });

  await step("validation awards XP once and persists across reload", async () => {
    await page.locator(".cm-content").click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Delete");
    await page.keyboard.insertText(REFERENCE_SOLUTIONS["data-lab.challenge-1"]);
    await page.getByRole("button", { name: "Submit for validation" }).click();
    await page.getByText("+50 XP").waitFor({ timeout: 120_000 });
    await page.goto(`${BASE}/academy/progress/`);
    await page.waitForFunction(() => /^\s*50/.test(document.querySelector('section[aria-label="Totals"]')?.innerText ?? ""), null, { timeout: 15_000 });
    const n = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).events.length, KEY);
    assert(n === 1, `events ${n}`);
  });

  for (const [world, lesson, chapter, file] of [
    ["data-lab", "data-lab.lesson-1", /Missing observations/, "data-lab-v1.mp4"],
    ["package-factory", "package-factory.lesson-1", /Exports and the NAMESPACE/, "package-factory-v1.mp4"],
  ]) {
    await step(`video (${file}): loads, captions track, chapter seek, transcript seek`, async () => {
      if (world === "package-factory") {
        await page.evaluate((k) => {
          const s = JSON.parse(localStorage.getItem(k));
          for (const slug of ["challenge-2", "boss"]) {
            s.events.push({ id: `x-${slug}`, type: "item.completed", itemId: `data-lab.${slug}`, itemKind: "challenge", missionId: "data-lab", occurredAt: "2026-11-01T00:00:00.000Z", receipt: { validatorId: `webr:output-match:data-lab.${slug}`, verdict: "passed", checkedAt: "2026-11-01T00:00:00.000Z" } });
          }
          localStorage.setItem(k, JSON.stringify(s));
        }, KEY);
      }
      await page.goto(`${BASE}/academy/missions/${world}/lessons/${lesson}/`);
      await page.getByRole("button", { name: "Watch", exact: true }).click();
      await page.waitForFunction(() => document.querySelector("[data-testid=lesson-video]")?.readyState >= 1, null, { timeout: 60_000 });
      const v = page.getByTestId("lesson-video");
      const info = await v.evaluate((el) => ({ d: el.duration, tracks: el.textTracks.length, err: el.error?.code ?? null }));
      assert(info.d > 150 && info.tracks === 1 && info.err === null, JSON.stringify(info));
      await page.getByRole("button", { name: chapter }).click();
      await page.waitForFunction(() => document.querySelector("[data-testid=lesson-video]").currentTime > 60, null, { timeout: 15_000 });
      await page.getByRole("tab", { name: "Transcript" }).click();
      await page.getByRole("list", { name: "Transcript" }).getByRole("button").nth(3).click();
      await page.waitForFunction(() => document.querySelector("[data-testid=lesson-video]").currentTime < 30, null, { timeout: 15_000 });
      const cueLoaded = await v.evaluate((el) => (el.textTracks[0].cues?.length ?? 0) > 0);
      assert(cueLoaded, "captions file parsed (cues loaded)");
    });
  }

  await step("phone layout: no horizontal overflow on map, lesson, challenge", async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mp = await m.newPage();
    for (const path of ["/academy/map/", "/academy/missions/data-lab/lessons/data-lab.lesson-1/", "/academy/missions/data-lab/challenges/data-lab.challenge-1/"]) {
      await mp.goto(BASE + path);
      await mp.waitForTimeout(800);
      const [sw, iw] = await mp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      assert(sw <= iw, `${path}: ${sw} > ${iw}`);
    }
    await m.close();
  });

  await step("no uncaught page errors", async () => assert(errors.length === 0, errors.join(" | ")));
  summary.push(`${name} ${browser.version()}:\n${rows.join("\n")}`);
  await browser.close();
}
site.stop();
console.log(summary.join("\n"));
console.log(failures ? `\n${failures} step(s) failed` : "\nAll browser steps passed");
process.exit(failures ? 1 : 0);
