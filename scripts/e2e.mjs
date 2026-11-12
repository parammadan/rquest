// End-to-end checks against a production build, driven by Playwright + system Chrome.
// Usage: pnpm build && pnpm test:e2e   (set SHOTS=1 to save screenshots)
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { pathRe, startSite } from "./lib/site.mjs";

const PORT = Number(process.env.PORT ?? 3107);
const SHOTS = process.env.SHOTS === "1";
const SHOT_DIR = new URL("../docs/screenshots/", import.meta.url).pathname;
const KEY = "rquest:progress:v1";

let failures = 0;
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(`  ✔ ${name}`);
  } catch (e) {
    failures++;
    results.push(`  ✘ ${name}\n      ${String(e?.message ?? e).split("\n")[0]}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const site = await startSite(PORT);
const BASE = site.base;

const browser = await chromium.launch({ channel: "chrome", headless: true });
if (SHOTS) mkdirSync(SHOT_DIR, { recursive: true });

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  page.consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && page.consoleErrors.push(m.text()));
  page.on("pageerror", (e) => page.consoleErrors.push(String(e)));
  return { ctx, page };
}
const h1 = (page) => page.locator("main h1").first().innerText();
const settle = (page) => page.waitForTimeout(700);

try {
  /* ------------------------------ desktop ------------------------------ */
  const { ctx, page } = await newPage();

  await check("landing renders and Start Learning enters the academy", async () => {
    await page.goto(BASE + "/");
    assert((await h1(page)).includes("research programmer"), "landing h1");
    if (SHOTS) {
      await page.waitForTimeout(2600);
      await page.screenshot({ path: SHOT_DIR + "01-landing.png" });
    }
    await page.getByRole("link", { name: /Start Learning/ }).first().click();
    await page.waitForURL(pathRe(BASE, "/academy"));
    await settle(page);
    assert((await h1(page)).includes("Welcome to the academy"), "dashboard h1");
  });

  await check("fresh learner shows zero XP, level 1, 0% completion", async () => {
    const tiles = await page.locator('section[aria-label="Progress summary"]').innerText();
    assert(/^0\s*$/m.test(tiles) || tiles.includes("\n0\n"), `XP tile: ${tiles}`);
    assert(tiles.includes("0/5"), "worlds 0/5");
    const ring = await page.getByRole("img", { name: /Academy completion/ }).getAttribute("aria-label");
    assert(ring.endsWith("0%"), ring);
    if (SHOTS) await page.screenshot({ path: SHOT_DIR + "02-dashboard.png" });
  });

  await check("sidebar navigation reaches every academy section", async () => {
    const nav = page.locator('aside nav[aria-label="Academy"]');
    for (const [label, url, heading] of [
      ["Mission Map", "/academy/map", "Five worlds"],
      ["Achievements", "/academy/achievements", "Achievements"],
      ["Progress", "/academy/progress", "Progress overview"],
      ["Dashboard", "/academy", "Welcome"],
    ]) {
      await nav.getByRole("link", { name: label }).click();
      await page.waitForURL(pathRe(BASE, url));
      await settle(page);
      assert((await h1(page)).includes(heading), `${label}: ${await h1(page)}`);
      const current = await nav.locator('[aria-current="page"]').innerText();
      assert(current.includes(label), `aria-current on ${label}`);
    }
  });

  await check("Continue/Start learning CTA opens the active mission", async () => {
    await page.getByRole("link", { name: /Start learning|Continue learning/ }).click();
    await page.waitForURL(pathRe(BASE, "/academy/missions/data-lab"));
    await settle(page);
    assert((await h1(page)) === "The Data Lab", "mission h1");
  });

  await check("map: World 1 unlocked, Worlds 2–5 locked", async () => {
    await page.goto(BASE + "/academy/map");
    await settle(page);
    const nodes = page.locator('.hidden.md\\:block [role="group"] button');
    assert((await nodes.count()) === 5, "5 nodes");
    const labels = await nodes.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    assert(labels[0].includes("Unlocked"), labels[0]);
    for (const l of labels.slice(1)) assert(l.includes("Locked"), l);
    if (SHOTS) {
      await page.waitForTimeout(900);
      await page.screenshot({ path: SHOT_DIR + "03-map.png" });
    }
  });

  await check("map: selecting a locked world explains why (dialog, Escape closes)", async () => {
    const nodes = page.locator('.hidden.md\\:block [role="group"] button');
    await nodes.nth(2).click();
    await page.getByRole("heading", { name: "Debugging Crisis" }).waitFor();
    await page.getByRole("button", { name: /Why is this locked/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const text = await dialog.innerText();
    assert(text.includes("World 3 is locked"), "dialog title");
    assert(text.includes("Package Factory"), "names prerequisite");
    if (SHOTS) await page.screenshot({ path: SHOT_DIR + "04-locked-dialog.png" });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    assert(!(await dialog.isVisible()), "dialog closed");
  });

  await check("map: hover previews a world in the briefing", async () => {
    const nodes = page.locator('.hidden.md\\:block [role="group"] button');
    await nodes.nth(4).hover();
    await page.getByRole("heading", { name: "Research Mission" }).waitFor({ timeout: 2000 });
  });

  await check("map: list view is an accessible alternative", async () => {
    await page.getByRole("button", { name: "List" }).click();
    const items = page.locator("main ol > li");
    assert((await items.count()) === 5, "5 list rows");
    await page.getByRole("link", { name: /Enter.*The Data Lab/ }).click();
    await page.waitForURL(pathRe(BASE, "/academy/missions/data-lab"));
  });

  await check("mission detail: timeline selects previews; placeholders are labelled", async () => {
    await settle(page);
    const tl = page.getByRole("list", { name: "Lessons and challenges" }).getByRole("button");
    assert((await tl.count()) === 6, "6 items");
    await tl.nth(0).click();
    await page.getByRole("link", { name: /Start lesson/ }).waitFor();
    await tl.nth(1).click();
    await page.getByRole("link", { name: /Open challenge/ }).waitFor();
    assert(/runs real r in your browser/i.test(await page.locator("main").innerText()), "live challenge copy");
    if (SHOTS) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      await page.screenshot({ path: SHOT_DIR + "05-mission-detail.png", fullPage: true });
    }
    await tl.nth(5).click();
    await page.getByText(/Boss mission · final challenge/i).waitFor();
  });

  await check("browsing mission pages cannot award XP (no run/submit controls, storage untouched)", async () => {
    const tl = page.getByRole("list", { name: "Lessons and challenges" }).getByRole("button");
    for (let i = 0; i < 6; i++) await tl.nth(i).click();
    const buttons = await page.locator("main button").allInnerTexts();
    assert(!buttons.some((t) => /\b(run|submit|complete|mark|claim)\b/i.test(t)), `buttons: ${buttons}`);
    const stored = await page.evaluate((k) => localStorage.getItem(k), KEY);
    assert(stored === null, `storage written: ${stored}`);
    await page.goto(BASE + "/academy/progress");
    await settle(page);
    assert((await page.locator("main").innerText()).includes("No XP awarded yet"), "ledger empty");
  });

  await check("locked worlds cannot be entered by direct URL", async () => {
    for (const id of ["package-factory", "debugging-crisis", "quality-control", "research-mission"]) {
      await page.goto(`${BASE}/academy/missions/${id}`);
      await settle(page);
      const t = await h1(page);
      assert(t.endsWith("is locked"), `${id}: ${t}`);
      const body = await page.locator("main").innerText();
      assert(!body.includes("Lessons & challenges"), `${id} leaked content`);
    }
    if (SHOTS) await page.screenshot({ path: SHOT_DIR + "06-locked-route.png" });
  });

  await check("unknown mission id renders the not-found page (noindex)", async () => {
    // Streaming (PPR) routes send a soft 404: correct UI + robots noindex, HTTP 200.
    await page.goto(`${BASE}/academy/missions/not-a-world`);
    await page.getByRole("heading", { name: /doesn.t exist/ }).waitFor();
    const robots = await page.locator('meta[name="robots"]').first().getAttribute("content");
    assert(robots?.includes("noindex"), `robots: ${robots}`);
  });

  await check("dev scenario page is not available in production", async () => {
    // Static hosting: the route is exported as the not-found page.
    await page.goto(`${BASE}/academy/dev/`);
    await page.getByRole("heading", { name: /doesn.t exist/ }).waitFor();
    assert(/off the map/i.test(await page.locator("main").innerText()), "renders not-found");
    assert(!(await page.locator("main").innerText()).includes("Seeded scenarios"), "no dev tools");
  });

  await check("unknown mission URL returns HTTP 404", async () => {
    const res = await page.goto(`${BASE}/academy/missions/not-a-world/`);
    assert(res.status() === 404, `status ${res.status()}`);
  });

  await check("achievements: all locked, detail dialog shows criteria", async () => {
    await page.goto(BASE + "/academy/achievements");
    await settle(page);
    const badges = page.locator("main ul > li > button");
    assert((await badges.count()) === 8, "8 badges");
    const labels = await badges.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    assert(labels.every((l) => l.includes("Locked")), "all locked");
    await badges.first().click();
    const text = await page.getByRole("dialog").innerText();
    assert(/how to unlock/i.test(text) && text.includes("Not yet unlocked"), `dialog: ${text}`);
    if (SHOTS) await page.screenshot({ path: SHOT_DIR + "07-achievements.png" });
    await page.keyboard.press("Escape");
  });

  await check("progress derives from stored events, persists, and never double-counts", async () => {
    const event = (id, validatorId) => ({
      id,
      type: "item.completed",
      itemId: "data-lab.lesson-1",
      itemKind: "lesson",
      missionId: "data-lab",
      occurredAt: "2026-01-02T10:00:00.000Z",
      receipt: { validatorId, verdict: "passed", checkedAt: "2026-01-02T10:00:00.000Z" },
    });
    const good = "lesson-check:data-lab.lesson-1";
    await page.evaluate(
      ([k, evs]) => localStorage.setItem(k, JSON.stringify({ schemaVersion: 1, learnerId: "e2e", events: evs })),
      [KEY, [event("a", good), event("b", good), event("c", "forged-by-ui")]],
    );
    for (const pass of [1, 2]) {
      await page.goto(BASE + "/academy/progress");
      await page.waitForFunction(() => /^\s*\d/.test(document.querySelector('section[aria-label="Totals"]')?.innerText ?? ""));
      const totals = await page.locator('section[aria-label="Totals"]').innerText();
      assert(totals.startsWith("20"), `pass ${pass} totals: ${totals.slice(0, 40)}`);
      assert(totals.includes("1 / 15"), `lessons 1/15 (pass ${pass})`);
      const rows = await page.locator("main table tbody tr").count();
      assert(rows === 1, `ledger rows ${rows}`);
    }
  });

  await check("reset clears progress", async () => {
    await page.getByRole("button", { name: "Reset progress" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reset progress" }).click();
    await settle(page);
    assert((await page.locator("main").innerText()).includes("No XP awarded yet"), "reset");
    assert((await page.evaluate((k) => localStorage.getItem(k), KEY)) === null, "storage cleared");
  });

  await check("keyboard: skip link, arrow keys between map nodes, Enter selects", async () => {
    await page.goto(BASE + "/academy/map");
    await settle(page);
    await page.keyboard.press("Tab");
    const first = await page.evaluate(() => document.activeElement?.textContent);
    assert(first?.includes("Skip to content"), `first tab stop: ${first}`);
    await page.locator('.hidden.md\\:block [role="group"] button').first().focus();
    await page.keyboard.press("ArrowRight");
    const label = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    assert(label?.startsWith("World 2"), `focus: ${label}`);
    await page.keyboard.press("Enter");
    await page.getByRole("heading", { name: "Package Factory" }).waitFor();
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    assert(outline !== "none", "visible focus ring");
  });

  await check("no console or hydration errors on desktop pages", async () => {
    assert(page.consoleErrors.filter((e) => !/404/.test(e)).length === 0, page.consoleErrors.join(" | "));
  });
  await ctx.close();

  /* ------------------------------- mobile ------------------------------- */
  const m = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await check("mobile: no horizontal overflow on any page", async () => {
    for (const path of ["/", "/academy", "/academy/map", "/academy/missions/data-lab", "/academy/missions/quality-control", "/academy/missions/data-lab/challenges/data-lab.challenge-1", "/academy/achievements", "/academy/progress"]) {
      await m.page.goto(BASE + path);
      await settle(m.page);
      const [sw, iw] = await m.page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      assert(sw <= iw, `${path}: scrollWidth ${sw} > ${iw}`);
    }
  });
  await check("mobile: vertical map, tab bar, tap selects a world", async () => {
    await m.page.goto(BASE + "/academy/map");
    await settle(m.page);
    const nodes = m.page.locator('.md\\:hidden [role="group"] button');
    assert((await nodes.count()) === 5, "tall layout nodes");
    assert(await m.page.locator('nav.fixed[aria-label="Academy"]').isVisible(), "tab bar");
    if (SHOTS) {
      await m.page.waitForTimeout(900);
      await m.page.screenshot({ path: SHOT_DIR + "08-map-mobile.png" });
    }
    await nodes.nth(1).tap();
    await m.page.getByRole("heading", { name: "Package Factory" }).waitFor();
  });
  await check("mobile: dashboard screenshot", async () => {
    await m.page.goto(BASE + "/academy");
    await settle(m.page);
    if (SHOTS) await m.page.screenshot({ path: SHOT_DIR + "09-dashboard-mobile.png" });
  });
  await m.ctx.close();

  /* ---------------------------- reduced motion --------------------------- */
  const r = await newPage({ reducedMotion: "reduce" });
  await check("reduced motion: content fully visible without animation", async () => {
    await r.page.goto(BASE + "/academy/map");
    await r.page.waitForTimeout(400);
    const op = await r.page.locator('.hidden.md\\:block [role="group"] button').first().evaluate((el) => {
      let n = el;
      let o = 1;
      while (n) {
        o *= Number(getComputedStyle(n).opacity);
        n = n.parentElement;
      }
      return o;
    });
    assert(op > 0.99, `node opacity ${op}`);
  });
  await r.ctx.close();
} finally {
  await browser.close();
  site.stop();
}

console.log(results.join("\n"));
console.log(failures ? `\n${failures} check(s) failed` : `\nAll ${results.length} checks passed`);
process.exit(failures ? 1 : 0);
