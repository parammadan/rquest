// Validator self-test inside real webR (Chrome), using the app's own grader and grading code:
// 1. every reference solution passes every check, and every starter does not;
// 2. adversarial cases (scripts/lib/adversarial-cases.mjs) behave as specified;
// 3. each starter, prefixed with the documented bypass kit, still fails its validator.
// Usage: pnpm build:pages && pnpm test:validators   (needs network for webR + R packages)
import { chromium } from "playwright-core";
import { startSite } from "./lib/site.mjs";
import { BYPASS_KIT, GENERIC_CASES } from "./lib/adversarial-cases.mjs";
import { catalog } from "../src/content/catalog.ts";
import { VALIDATORS } from "../src/content/validators/index.ts";
import { REFERENCE_SOLUTIONS } from "../src/content/validators/reference-solutions.ts";
import { R_GRADER } from "../src/features/runtime/harness.ts";
import { gradeSubmission } from "../src/features/runtime/grade.ts";

const PORT = 3113;
const WEBR = "https://webr.r-wasm.org/v0.6.0/";
const site = await startSite(PORT);
const browser = await chromium.launch({ channel: "chrome", headless: true });
let failures = 0;
const line = (ok, text) => {
  if (!ok) failures++;
  console.log(`  ${ok ? "✔" : "✘"} ${text}`);
};

try {
  const page = await browser.newPage();
  await page.goto(site.base + "/");
  // Start (or restart) webR and install the grader exactly as the app does.
  const boot = () =>
    page.evaluate(
      async ({ webrBase, grader }) => {
        if (window.__w) window.__w.close();
        const { WebR } = await import(`${webrBase}webr.mjs`);
        const w = new WebR({ baseUrl: webrBase, interactive: false });
        await w.init();
        window.__g = await w.evalR(grader);
        window.__w = w;
        return await w.evalRBoolean('!exists(".rquest") && !exists(".rq_code")');
      },
      { webrBase: WEBR, grader: R_GRADER },
    );
  const noGlobals = await boot();
  line(noGlobals, "grader installs without any global binding (.rquest / .rq_code absent)");

  const grade = (code, setup, checks, packages = []) =>
    page.evaluate(
      async ({ src, code, setup, checks, packages }) => {
        const w = window.__w;
        for (const p of packages) {
          if (!(await w.evalRBoolean(`requireNamespace("${p}", quietly = TRUE)`))) await w.installPackages([p], { quiet: true });
        }
        const gradeSubmission = (0, eval)(`(${src})`);
        return await gradeSubmission(w, window.__g, code, setup, checks);
      },
      { src: gradeSubmission.toString(), code, setup, checks, packages },
    );

  console.log("Reference solutions and starters");
  for (const v of VALIDATORS) {
    const item = catalog.getItem(v.challengeId);
    for (const [label, code, shouldPass] of [
      ["reference", REFERENCE_SOLUTIONS[v.challengeId], true],
      ["starter", item.starterCode, false],
    ]) {
      if (!code) {
        line(false, `${v.challengeId} ${label}: missing`);
        continue;
      }
      const verdicts = await grade(code, v.setup, v.checks.map((c) => c.expr), item.packages);
      const allPass = verdicts.length === v.checks.length && verdicts.every((x) => x === "PASS");
      const detail = ["SYNTAX", "ERROR", "TAMPER"].includes(verdicts[0]) ? verdicts.join(": ") : v.checks.map((c, i) => `${c.id}=${verdicts[i]}`).join(" ");
      line(allPass === shouldPass && verdicts[0] !== "TAMPER", `${v.challengeId} ${label} → ${allPass ? "all pass" : "not all pass"}  (${detail})`);
    }
  }

  console.log("Adversarial cases (generic)");
  for (const c of GENERIC_CASES) {
    const verdicts = await grade(c.code, c.setup, c.checks);
    const got = verdicts[0] === "TAMPER" || verdicts[0] === "SYNTAX" || verdicts[0] === "ERROR" ? verdicts[0] : verdicts.join(" ");
    line(got === c.expect, `${c.name} → ${got}`);
    if (c.tamper) await boot(); // the app discards the worker after tampering
  }

  console.log("Bypass kit against every real validator (starter + bypasses must not pass)");
  for (const v of VALIDATORS) {
    const item = catalog.getItem(v.challengeId);
    const verdicts = await grade(`${BYPASS_KIT}\n${item.starterCode}`, v.setup, v.checks.map((c) => c.expr), item.packages);
    const allPass = verdicts.length === v.checks.length && verdicts.every((x) => x === "PASS");
    line(!allPass, `${v.challengeId}: ${allPass ? "BYPASSED" : `blocked (${verdicts.filter((x) => x === "PASS").length}/${v.checks.length} checks pass, ${verdicts[0] === "ERROR" ? "code errored" : "rest fail"})`}`);
  }
} finally {
  await browser.close();
  site.stop();
}
console.log(failures ? `\n${failures} failure(s)` : "\nAll validators and adversarial cases behave as expected");
process.exit(failures ? 1 : 0);
