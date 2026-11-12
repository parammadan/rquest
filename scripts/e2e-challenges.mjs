// Phase 2 end-to-end: real R (webR from its CDN) executing and validating
// World 1 challenges in Chrome. Needs network access. Slow on first run
// (downloads webR and dplyr).   Usage: pnpm build && pnpm test:e2e:challenges
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { startSite } from "./lib/site.mjs";
import { REFERENCE_SOLUTIONS } from "../src/content/validators/reference-solutions.ts";

const PORT = 3111;
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
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

async function totalsText() {
  const sel = 'section[aria-label="Totals"]';
  await page.waitForFunction((q) => /^\s*\d/.test(document.querySelector(q)?.innerText ?? ""), sel, { timeout: 15_000 });
  return page.locator(sel).innerText();
}
// Completions only: graded submissions also record challenge.attempted evidence (see e2e-attempts.mjs).
const events = () =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{"events":[]}').events.filter((e) => e.type === "item.completed").length, KEY);

async function setCode(code) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
  const got = await page.evaluate(() => document.querySelector(".cm-content").innerText);
  assert(got.replace(/\s+/g, "") === code.replace(/\s+/g, ""), "editor content mismatch");
}
async function submit(timeout = 240_000) {
  await page.getByRole("button", { name: "Submit for validation" }).click();
  const banner = page.locator('[role="status"]').filter({ hasText: /checks passed|raised an error|syntax error|Grading refused|Time limit|problem/ });
  await banner.first().waitFor({ timeout });
  return banner.first().innerText();
}
async function runCode(timeout = 120_000) {
  await page.getByRole("button", { name: /^Run$/ }).click();
  const log = page.getByRole("log");
  await page.waitForFunction(() => !document.querySelector('[role="log"]')?.textContent?.includes("> Running…"), null, { timeout });
  return log.innerText();
}

try {
  await check("mission page shows World 1 challenges as live and opens the workspace", async () => {
    await page.goto(BASE + "/academy/missions/data-lab");
    const timeline = page.getByRole("list", { name: "Lessons and challenges" });
    await timeline.waitFor();
    const tl = await timeline.innerText();
    assert((tl.match(/LIVE/gi) ?? []).length === 6, "3 live lessons + 3 live challenges");
    await timeline.getByRole("button", { name: /Clean the site codes/ }).click();
    await page.getByRole("link", { name: /Open challenge/ }).click();
    await page.waitForURL(/challenges\/data-lab\.challenge-1\/?$/);
    await page.getByRole("heading", { name: "Clean the site codes" }).waitFor();
  });

  await check("hard-coded answer fails the unseen-input check; no XP", async () => {
    await setCode(`clean_site <- function(x) c("BOS-01", "BOS-01", "NYC-02", "NYC-02", NA, "CHI-03")`);
    const text = await submit();
    assert(/[0-9] of 5 checks passed/.test(text) && !text.startsWith("5 of 5"), text);
    assert(text.includes("No XP awarded"), text);
    assert((await events()) === 0, "no event stored");
    const hint = await page.locator("main").innerText();
    assert(hint.includes("Hint: Don't hard-code values"), "unseen hint shown");
  });

  await check("Run executes R and prints to the console (no submission)", async () => {
    await setCode(`print(sites)\nmessage("hello from R")\nsum(1:10)`);
    const out = await runCode();
    assert(out.includes("BOS-01") && out.includes("hello from R") && out.includes("[1] 55"), out);
    assert((await events()) === 0, "run stored nothing");
  });

  await check("learner code cannot tamper with the validation harness", async () => {
    await setCode(`.rquest$validate <- function(...) rep("PASS", 5)\nclean_site <- function(x) x`);
    const text = await submit();
    assert(text.includes("raised an error"), text);
    assert((await events()) === 0, "no event stored");
  });

  await check("correct solution passes all checks and records +50 XP once", async () => {
    await setCode(REFERENCE_SOLUTIONS["data-lab.challenge-1"]);
    const text = await submit();
    assert(text.includes("All checks passed") && text.includes("+50 XP"), text);
    assert(text.includes("First Steps"), `achievement: ${text}`);
    assert((await events()) === 1, "one event");
    if (SHOTS) await page.screenshot({ path: SHOT_DIR + "13-challenge-passed.png", fullPage: true });
  });

  await check("re-submitting does not award duplicate XP", async () => {
    const text = await submit();
    assert(text.includes("Already validated"), text);
    assert((await events()) === 1, "still one event");
  });

  await check("draft survives a reload", async () => {
    await page.reload();
    await page.locator(".cm-content").waitFor();
    const got = await page.evaluate(() => document.querySelector(".cm-content").innerText);
    assert(got.includes("toupper(trimws(x))"), "draft restored");
    assert((await page.locator("main header").innerText()).includes("Validated"), "status validated");
  });

  await check("infinite loop is stopped by the time limit and R restarts", async () => {
    await setCode(`while (TRUE) {}`);
    const out = await runCode(60_000);
    assert(out.includes("Stopped after 10s"), out);
    await setCode(`1 + 1`);
    const again = await runCode(120_000);
    assert(again.includes("[1] 2"), again);
  });

  await check("challenge 2 installs dplyr, validates, +60 XP", async () => {
    await page.goto(BASE + "/academy/missions/data-lab/challenges/data-lab.challenge-2");
    await page.locator(".cm-content").waitFor();
    await setCode(`library(dplyr)\nsummarise_by_arm <- function(df) df |> filter(visit == "Week 12") |> group_by(arm) |> summarise(n = n(), mean = mean(outcome, na.rm = TRUE), sd = sd(outcome, na.rm = TRUE))`);
    const wrong = await submit(400_000);
    assert(/of 5 checks passed/.test(wrong) && !wrong.includes("All checks"), `n() counting NAs should fail: ${wrong}`);
    await setCode(REFERENCE_SOLUTIONS["data-lab.challenge-2"]);
    const text = await submit();
    assert(text.includes("All checks passed") && text.includes("+60 XP"), text);
  });

  await check("boss: messy export validates, +150 XP", async () => {
    await page.goto(BASE + "/academy/missions/data-lab/challenges/data-lab.boss");
    await page.locator(".cm-content").waitFor();
    await setCode(REFERENCE_SOLUTIONS["data-lab.boss"]);
    const text = await submit();
    assert(text.includes("All checks passed") && text.includes("+150 XP"), text);
    if (SHOTS) await page.screenshot({ path: SHOT_DIR + "14-boss-passed.png", fullPage: true });
  });

  await check("progress reflects exactly the validated work (260 XP); clearing World 1 unlocks World 2", async () => {
    await page.goto(BASE + "/academy/progress");
    const totals = await totalsText();
    assert(totals.startsWith("260"), totals.slice(0, 30));
    assert(totals.includes("3 / 15"), `challenges 3/15: ${totals}`);
    assert((await page.locator("main table tbody tr").count()) === 3, "3 ledger rows");
    await page.goto(BASE + "/academy/achievements");
    await page.waitForTimeout(800);
    const unlocked = await page.locator("main ul > li > button").evaluateAll((els) =>
      els.map((e) => e.getAttribute("aria-label")).filter((l) => l.includes("Unlocked")),
    );
    assert(unlocked.length === 2 && unlocked.some((l) => l.startsWith("Data Explorer")), `achievements: ${unlocked}`);
    await page.goto(BASE + "/academy/missions/package-factory");
    await page.waitForTimeout(800);
    assert((await page.locator("main h1").first().innerText()) === "Package Factory", "World 2 unlocked");
    await page.goto(BASE + "/academy/missions/debugging-crisis");
    await page.waitForTimeout(800);
    assert((await page.locator("main h1").first().innerText()).endsWith("is locked"), "World 3 still locked");
    if (SHOTS) {
      await page.goto(BASE + "/academy/map");
      await page.waitForTimeout(1500);
      await page.screenshot({ path: SHOT_DIR + "16-map-world1-cleared.png" });
    }
    if (SHOTS) {
      await page.goto(BASE + "/academy");
      await page.waitForTimeout(1200);
      await page.screenshot({ path: SHOT_DIR + "15-dashboard-after-challenges.png" });
    }
  });

  await check("World 2: starter fails the documented checks; reference passes, +60 XP", async () => {
    await page.goto(BASE + "/academy/missions/package-factory/challenges/package-factory.challenge-1");
    await page.locator(".cm-content").waitFor();
    const starter = await submit(400_000);
    assert(/of 6 checks passed/.test(starter) && !starter.includes("All checks"), starter);
    const main = await page.locator("main").innerText();
    assert(main.includes("Hint: Add #' @export"), "export hint");
    await setCode(REFERENCE_SOLUTIONS["package-factory.challenge-1"]);
    const text = await submit();
    assert(text.includes("All checks passed") && text.includes("+60 XP"), text);
  });

  await check("World 2: imports and docs challenge, then the boss — World 2 cleared", async () => {
    await page.goto(BASE + "/academy/missions/package-factory/challenges/package-factory.challenge-2");
    await page.locator(".cm-content").waitFor();
    await setCode(REFERENCE_SOLUTIONS["package-factory.challenge-2"]);
    const c2 = await submit();
    assert(c2.includes("+70 XP"), c2);
    await page.goto(BASE + "/academy/missions/package-factory/challenges/package-factory.boss");
    await page.locator(".cm-content").waitFor();
    await setCode(REFERENCE_SOLUTIONS["package-factory.boss"]);
    const boss = await submit();
    assert(boss.includes("+200 XP") && boss.includes("Package Builder"), boss);
    await page.goto(BASE + "/academy/progress");
    const totals = await totalsText();
    assert(totals.startsWith("590"), totals.slice(0, 20));
    await page.goto(BASE + "/academy/missions/debugging-crisis");
    await page.waitForTimeout(800);
    assert((await page.locator("main h1").first().innerText()) === "Debugging Crisis", "World 3 unlocked");
    if (SHOTS) {
      await page.goto(BASE + "/academy/map");
      await page.waitForTimeout(1500);
      await page.screenshot({ path: SHOT_DIR + "17-map-world2-cleared.png" });
    }
  });

  await check("Worlds 3–5: every challenge validates through the UI; each world unlocks the next", async () => {
    const plan = [
      ["debugging-crisis", ["challenge-1", 70], ["challenge-2", 70], ["boss", 220]],
      ["quality-control", ["challenge-1", 70], ["challenge-2", 80], ["boss", 240]],
      ["research-mission", ["challenge-1", 80], ["challenge-2", 80], ["boss", 300]],
    ];
    for (const [world, ...items] of plan) {
      for (const [slug, xp] of items) {
        await page.goto(`${BASE}/academy/missions/${world}/challenges/${world}.${slug}`);
        await page.locator(".cm-content").waitFor({ timeout: 20_000 });
        await setCode(REFERENCE_SOLUTIONS[`${world}.${slug}`]);
        const text = await submit(400_000);
        assert(text.includes("All checks passed") && text.includes(`+${xp} XP`), `${world}.${slug}: ${text}`);
      }
    }
  });

  await check("academy cleared: 1,800 XP, level 6, all 8 achievements, 5/5 worlds cleared", async () => {
    await page.goto(BASE + "/academy/progress");
    const totals = await totalsText();
    assert(totals.startsWith("1,800"), totals.slice(0, 20));
    assert(totals.includes("15 / 15") && totals.includes("5 / 5") && totals.includes("8 / 8"), totals);
    assert((await page.locator("main").innerText()).includes("Level 6"), "level 6");
    await page.goto(BASE + "/academy/map");
    await page.waitForTimeout(1500);
    assert((await page.locator("main").innerText()).includes("5/5 worlds cleared"), "5/5 cleared");
    if (SHOTS) {
      await page.screenshot({ path: SHOT_DIR + "18-map-all-cleared.png" });
      await page.goto(BASE + "/academy/achievements");
      await page.waitForTimeout(1000);
      await page.screenshot({ path: SHOT_DIR + "19-achievements-earned.png" });
    }
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
