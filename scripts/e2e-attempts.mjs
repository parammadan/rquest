// Milestone 4A end-to-end: attempt evidence, schema v1 → v2 migration, the hardened grader
// through the real UI, and the learning-insights panel. Real webR in Chrome (needs network).
// Usage: pnpm build:pages && pnpm test:e2e:attempts      (SHOTS=1 also saves screenshots)
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { startSite } from "./lib/site.mjs";
import { catalog } from "../src/content/catalog.ts";
import { REFERENCE_SOLUTIONS } from "../src/content/validators/reference-solutions.ts";
import { buildScenarioSnapshot, DEV_SCENARIOS } from "../src/features/progress/dev-scenarios.ts";

const PORT = 3119;
const KEY = "rquest:progress:v2";
const LEGACY = "rquest:progress:v1";
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

const stored = (p = page, k = KEY) => p.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{"events":[]}'), k);
const attempts = async () => (await stored()).events.filter((e) => e.type === "challenge.attempted");
const completions = async () => (await stored()).events.filter((e) => e.type === "item.completed");

async function setCode(code) {
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
}
async function submit(timeout = 240_000) {
  const before = (await attempts()).length;
  await page.getByRole("button", { name: "Submit for validation" }).click();
  const banner = page.locator('[role="status"]').filter({ hasText: /checks passed|raised an error|syntax error|Grading refused|Time limit|problem/ });
  await banner.first().waitFor({ timeout });
  return { text: await banner.first().innerText(), before };
}
const CH = "data-lab.challenge-1";
const CH_URL = `${BASE}/academy/missions/data-lab/challenges/${CH}/`;

try {
  await check("fresh learner: insights show an empty state, not invented numbers", async () => {
    await page.goto(`${BASE}/academy/progress/`);
    await page.getByTestId("insights-empty").waitFor();
    assert((await page.getByTestId("learning-insights").innerText()).includes("No graded attempts yet"), "empty state");
  });

  await check("opening a challenge and running code records no attempt", async () => {
    await page.goto(CH_URL);
    await page.locator(".cm-content").waitFor();
    await setCode("print(sites)");
    await page.getByRole("button", { name: /^Run$/ }).click();
    await page.waitForFunction(() => document.querySelector('[role="log"]')?.textContent?.includes("BOS-01"), null, { timeout: 180_000 });
    assert((await attempts()).length === 0, "no attempt from Run");
  });

  await check("a failed submission records attempt 1 with failed check ids, active time, and no code", async () => {
    await setCode(`clean_site <- function(x) c("BOS-01", "BOS-01", "NYC-02", "NYC-02", NA, "CHI-03")`);
    const { text } = await submit();
    assert(/of 5 checks passed/.test(text), text);
    const [a] = await attempts();
    assert(a && a.attempt === 1 && a.outcome === "failed" && a.itemId === CH && a.missionId === "data-lab", JSON.stringify(a));
    assert(a.failedCheckIds.includes("unseen") && !a.failedCheckIds.includes("sample"), JSON.stringify(a.failedCheckIds));
    assert(typeof a.activeMs === "number" && a.activeMs > 0, `activeMs ${a.activeMs}`);
    assert(
      JSON.stringify(Object.keys(a).sort()) === JSON.stringify(["activeMs", "attempt", "failedCheckIds", "id", "itemId", "missionId", "occurredAt", "outcome", "type"]),
      `only minimal fields: ${Object.keys(a)}`,
    );
    assert(!JSON.stringify(a).includes("clean_site"), "no learner code in the event");
    assert((await completions()).length === 0, "no completion");
  });

  await check("a syntax error records attempt 2 as syntax-error", async () => {
    await setCode("clean_site <- function(x {");
    const { text } = await submit();
    assert(text.includes("syntax error"), text);
    const a = (await attempts())[1];
    assert(a.attempt === 2 && a.outcome === "syntax-error" && a.failedCheckIds.length === 0, JSON.stringify(a));
  });

  await check("the documented isTRUE / identical bypasses no longer pass (attempt 3 fails)", async () => {
    await setCode(`assign("isTRUE", function(x) TRUE, envir = globalenv())\nidentical <- function(...) TRUE\nclean_site <- function(x) x`);
    const { text } = await submit();
    assert(/[0-4] of 5 checks passed/.test(text), text);
    assert(text.includes("No XP awarded"), text);
    assert((await attempts())[2].outcome === "failed" && (await completions()).length === 0, "failed, no XP");
  });

  await check("changing base R is refused (attempt 4 = integrity) and R restarts cleanly", async () => {
    await setCode(`unlockBinding("isTRUE", baseenv())\nassign("isTRUE", function(x) TRUE, envir = baseenv())\nclean_site <- function(x) x`);
    const { text } = await submit();
    assert(text.includes("Grading refused") && text.includes("isTRUE"), text);
    assert((await attempts())[3].outcome === "integrity", "integrity outcome");
  });

  await check("the correct solution passes: attempt 5 passed, +50 XP once", async () => {
    await setCode(REFERENCE_SOLUTIONS[CH]);
    const { text } = await submit();
    assert(text.includes("All checks passed") && text.includes("+50 XP"), text);
    assert((await attempts())[4].outcome === "passed" && (await attempts())[4].attempt === 5, "attempt 5 passed");
    assert((await completions()).length === 1, "one completion");
  });

  await check("re-submitting records attempt 6 but no duplicate XP", async () => {
    const { text } = await submit();
    assert(text.includes("Already validated"), text);
    assert((await attempts()).length === 6 && (await completions()).length === 1, "6 attempts, 1 completion");
  });

  await check("attempts survive a refresh", async () => {
    await page.reload();
    await page.locator(".cm-content").waitFor();
    assert((await attempts()).map((a) => a.outcome).join(",") === "failed,syntax-error,failed,integrity,passed,passed", "order kept");
  });

  await check("insights reflect exactly the recorded attempts", async () => {
    await page.goto(`${BASE}/academy/progress/`);
    const panel = page.getByTestId("learning-insights");
    await panel.getByText("Challenges attempted").waitFor();
    const t = await panel.innerText();
    assert(t.includes("1 / 15") && t.includes("Challenges attempted"), "attempted 1 of 15");
    assert(/1\s*Challenges solved/.test(t), "solved 1");
    assert(t.includes("0 of 1") && t.includes("Solved on the first try"), "first try 0 of 1");
    assert(/6\s*Graded attempts/.test(t), "6 attempts");
    assert((await page.getByTestId("insights-errors").innerText()).includes("1 syntax error") && t.includes("1 refused submission"), "error breakdown");
    const failed = await page.getByTestId("failed-checks").innerText();
    assert(failed.includes("Works on site codes it hasn't seen"), failed);
    // Two failed attempts on site cleaning, then solved: shown as a (resolved) practice area, per the rule.
    const practice = await page.getByTestId("practice").innerText();
    assert(practice.includes("Cleaning messy values") && practice.includes("Failed in 2 attempts"), practice);
    assert(practice.includes("Revisit: Vectors, functions, and missing values"), practice);
    if (SHOTS) await page.screenshot({ path: SHOT_DIR + "4a-insights-desktop.png", fullPage: true });
  });

  await check("an unsolved repeated failure becomes a practice area linked to its lesson", async () => {
    await page.goto(`${BASE}/academy/missions/data-lab/challenges/data-lab.challenge-2/`);
    await page.locator(".cm-content").waitFor();
    for (let k = 0; k < 2; k++) {
      await setCode("library(dplyr)\nsummarise_by_arm <- function(df) data.frame(arm = c('Placebo', 'Treatment'), n = 1, mean = NA, sd = NA)");
      const { text } = await submit();
      assert(/of 5 checks passed/.test(text), text);
    }
    await page.goto(`${BASE}/academy/progress/`);
    const practice = page.getByTestId("practice");
    await practice.waitFor();
    const t = await practice.innerText();
    assert(t.includes("Missing values") || t.includes("Summaries and tables"), t);
    const href = await practice.getByRole("link", { name: /Revisit:/ }).first().getAttribute("href");
    assert(href.endsWith("/academy/missions/data-lab/lessons/data-lab.lesson-2"), href);
    await practice.getByRole("link", { name: /Revisit:/ }).first().click();
    await page.getByRole("heading", { name: "Data frames and grouped summaries" }).waitFor();
    if (SHOTS) {
      await page.goto(`${BASE}/academy/progress/`);
      await page.getByTestId("practice").waitFor();
      await page.getByTestId("learning-insights").screenshot({ path: SHOT_DIR + "4a-insights-panel.png" });
    }
  });

  await check("reset clears attempts and completions but keeps code drafts", async () => {
    const draftsBefore = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("rquest:draft:")).length);
    await page.goto(`${BASE}/academy/progress/`);
    await page.getByRole("button", { name: "Reset progress" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Reset progress" }).click();
    await page.getByTestId("insights-empty").waitFor();
    assert((await page.evaluate((k) => localStorage.getItem(k), KEY)) === null, "v2 cleared");
    const draftsAfter = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("rquest:draft:")).length);
    assert(draftsBefore > 0 && draftsAfter === draftsBefore, `drafts kept (${draftsBefore} → ${draftsAfter})`);
  });

  await check("a fully completed v1 learner migrates: 2,100 XP, Level 7, 8 achievements, v1 untouched", async () => {
    const p2 = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
    p2.on("pageerror", (e) => errors.push(String(e)));
    const v1 = JSON.stringify({ schemaVersion: 1, learnerId: "legacy", events: buildScenarioSnapshot(DEV_SCENARIOS[2], catalog).events });
    await p2.goto(`${BASE}/`);
    await p2.evaluate(([k, v]) => localStorage.setItem(k, v), [LEGACY, v1]);
    await p2.goto(`${BASE}/academy/`);
    await p2.getByTestId("max-level").waitFor();
    const dash = await p2.locator("main").innerText();
    assert(dash.includes("Level 7") && dash.includes("Principal Research Programmer"), "level 7");
    assert(!/XP to /.test(dash), "no impossible 'XP to next level'");
    await p2.goto(`${BASE}/academy/progress/`);
    await p2.waitForFunction(() => /^\s*2,100/.test(document.querySelector('section[aria-label="Totals"]')?.innerText ?? ""), null, { timeout: 15_000 });
    const totals = await p2.locator('section[aria-label="Totals"]').innerText();
    assert(totals.includes("8 / 8") && totals.includes("15 / 15"), totals);
    const earlier = await p2.getByTestId("earlier-completions").innerText();
    assert(earlier.includes("15 challenges were completed before attempt tracking began"), earlier);
    assert((await p2.evaluate((k) => localStorage.getItem(k), LEGACY)) === v1, "v1 left byte-for-byte");
    if (SHOTS) await p2.getByTestId("learning-insights").screenshot({ path: SHOT_DIR + "4a-insights-migrated.png" });
    await p2.close();
  });

  await check("unreadable saved progress is reported and never overwritten", async () => {
    const p3 = await (await browser.newContext()).newPage();
    await p3.goto(`${BASE}/`);
    await p3.evaluate((k) => localStorage.setItem(k, '{"schemaVersion": 3, "events": []}'), KEY);
    await p3.goto(`${BASE}/academy/`);
    await p3.locator('[data-testid="storage-issue"]:visible').waitFor();
    assert((await p3.evaluate((k) => localStorage.getItem(k), KEY)) === '{"schemaVersion": 3, "events": []}', "untouched");
    await p3.close();
  });

  await check("mobile: insights panel has no horizontal overflow", async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mp = await m.newPage();
    await mp.goto(`${BASE}/`);
    const events = [
      { id: "a1", type: "challenge.attempted", itemId: "data-lab.boss", missionId: "data-lab", occurredAt: "2026-11-12T10:00:00.000Z", attempt: 1, outcome: "failed", failedCheckIds: ["dates", "types", "sites"], activeMs: 240000 },
      { id: "a2", type: "challenge.attempted", itemId: "data-lab.boss", missionId: "data-lab", occurredAt: "2026-11-12T10:05:00.000Z", attempt: 2, outcome: "failed", failedCheckIds: ["dates"], activeMs: 120000 },
    ];
    await mp.evaluate(([k, ev]) => localStorage.setItem(k, JSON.stringify({ schemaVersion: 2, learnerId: "m", events: ev })), [KEY, events]);
    await mp.goto(`${BASE}/academy/progress/`);
    await mp.getByTestId("practice").waitFor();
    const [sw, iw] = await mp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert(sw <= iw, `${sw} > ${iw}`);
    if (SHOTS) await mp.screenshot({ path: SHOT_DIR + "4a-insights-mobile.png", fullPage: true });
    await m.close();
  });

  await check("no uncaught page errors", async () => assert(errors.length === 0, errors.join(" | ")));
} finally {
  await browser.close();
  site.stop();
}
console.log(results.join("\n"));
console.log(failures ? `\n${failures} check(s) failed` : `\nAll ${results.length} checks passed`);
process.exit(failures ? 1 : 0);
