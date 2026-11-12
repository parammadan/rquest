// Writes projects/<id>/solution.json from the app's reference solutions, so a debrief shows
// exactly the code the validator self-test proves passes every check.
//   node --experimental-strip-types tools/solution.mts projects/<id> <challengeId>
import { writeFileSync } from "node:fs";
import { REFERENCE_SOLUTIONS } from "../../src/content/validators/reference-solutions.ts";
const [dir, challengeId] = process.argv.slice(2);
const code = REFERENCE_SOLUTIONS[challengeId];
if (!code) throw new Error(`no reference solution for ${challengeId}`);
writeFileSync(`${dir}/solution.json`, JSON.stringify({ challengeId, code }, null, 2) + "\n");
console.log(`${dir}/solution.json: ${code.split("\n").length} lines`);
