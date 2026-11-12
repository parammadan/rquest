// Validator self-test inside real webR (Chrome): for every validator,
// the reference solution must pass every check and the starter code must not.
// Usage: pnpm build && pnpm test:validators
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { catalog } from "../src/content/catalog.ts";
import { VALIDATORS } from "../src/content/validators/index.ts";
import { REFERENCE_SOLUTIONS } from "../src/content/validators/reference-solutions.ts";
import { R_HARNESS } from "../src/features/runtime/harness.ts";

const PORT = 3113;
const server = spawn("pnpm", ["exec", "next", "start", "-p", String(PORT)], { stdio: ["ignore", "pipe", "inherit"] });
await new Promise((r) => server.stdout.on("data", (d) => /Ready|Local:/i.test(String(d)) && r()));
const browser = await chromium.launch({ channel: "chrome", headless: true });
let failures = 0;
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`);
  await page.evaluate(async (harness) => {
    const { WebR } = await import("https://webr.r-wasm.org/v0.6.0/webr.mjs");
    const w = new WebR({ baseUrl: "https://webr.r-wasm.org/v0.6.0/", interactive: false });
    await w.init();
    await w.evalRVoid(harness);
    window.__w = w;
  }, R_HARNESS);

  for (const v of VALIDATORS) {
    const item = catalog.getItem(v.challengeId);
    const cases = [
      ["reference", REFERENCE_SOLUTIONS[v.challengeId], true],
      ["starter", item.starterCode, false],
    ];
    for (const [label, code, shouldPass] of cases) {
      if (!code) {
        failures++;
        console.log(`  ✘ ${v.challengeId} ${label}: missing`);
        continue;
      }
      const verdicts = await page.evaluate(
        async ({ code, setup, checks, packages }) => {
          const w = window.__w;
          for (const p of packages) {
            if (!(await w.evalRBoolean(`requireNamespace("${p}", quietly = TRUE)`))) await w.installPackages([p], { quiet: true });
          }
          await w.objs.globalEnv.bind(".rq_code", code);
          await w.objs.globalEnv.bind(".rq_setup", setup);
          await w.objs.globalEnv.bind(".rq_checks", checks);
          const res = await w.evalR(".rquest$validate(.rq_code, .rq_setup, .rq_checks)");
          return (await res.toJs()).values;
        },
        { code, setup: v.setup, checks: v.checks.map((c) => c.expr), packages: item.packages },
      );
      const allPass = verdicts.length === v.checks.length && verdicts.every((x) => x === "PASS");
      const ok = allPass === shouldPass;
      if (!ok) failures++;
      const detail = verdicts[0] === "ERROR" ? verdicts[1] : v.checks.map((c, i) => `${c.id}=${verdicts[i]}`).join(" ");
      console.log(`  ${ok ? "✔" : "✘"} ${v.challengeId} ${label} → ${allPass ? "all pass" : "not all pass"}  (${detail})`);
    }
  }
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
console.log(failures ? `\n${failures} failure(s)` : "\nAll validators behave as expected");
process.exit(failures ? 1 : 0);
