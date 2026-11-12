// Screenshots of developer-seeded states (completed / active / locked).
// Requires a build with dev tools enabled:
//   NEXT_PUBLIC_RQUEST_DEV_TOOLS=1 pnpm build && node scripts/scenario-shots.mjs
// Every screenshot shows the "Developer scenario" banner — seeded, not real progress.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { pathRe, startSite } from "./lib/site.mjs";

const PORT = 3109;
const DIR = new URL("../docs/screenshots/", import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });

const site = await startSite(PORT);
const BASE = site.base;
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  for (const [id, file, path] of [
    ["world-3-active", "10-scenario-map-mixed.png", "/academy/map"],
    ["world-3-active", "11-scenario-dashboard.png", "/academy"],
    ["academy-complete", "12-scenario-achievements.png", "/academy/achievements"],
  ]) {
    await page.goto(BASE + "/academy/dev");
    await page.locator("li", { hasText: id === "world-3-active" ? "World 3 active" : "Academy complete" }).getByRole("button").click();
    await page.waitForURL(pathRe(BASE, "/academy/map"));
    await page.goto(BASE + path);
    await page.waitForTimeout(2200);
    const banner = await page.getByRole("status").innerText();
    if (!banner.includes("Seeded test data")) throw new Error("scenario banner missing");
    await page.screenshot({ path: DIR + file });
    console.log("saved", file);
  }
} finally {
  await browser.close();
  site.stop();
}
