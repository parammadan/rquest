import { createValidatorRegistry, type ValidatorRegistry } from "../../domain/completion.ts";
import { MISSIONS } from "../missions.ts";
import type { ValidatorDefinition } from "../../domain/evaluation.ts";
import { cleanSiteValidator, messyExportValidator, summariseArmValidator } from "./data-lab.ts";
import { dependenciesValidator, exportsValidator, shipLabtoolsValidator } from "./package-factory.ts";
import { maskedValidator, scopingValidator, worksOnMyMachineValidator } from "./debugging-crisis.ts";
import { independentQcValidator, mutationValidator, validateInputValidator } from "./quality-control.ts";
import { bootstrapValidator, reviewerRerunValidator, traceNumbersValidator } from "./research-mission.ts";

/** Every validator that exists. A challenge is `available` only if listed here. */
export const VALIDATORS: readonly ValidatorDefinition[] = [
  cleanSiteValidator,
  summariseArmValidator,
  messyExportValidator,
  exportsValidator,
  dependenciesValidator,
  shipLabtoolsValidator,
  maskedValidator,
  scopingValidator,
  worksOnMyMachineValidator,
  mutationValidator,
  validateInputValidator,
  independentQcValidator,
  bootstrapValidator,
  traceNumbersValidator,
  reviewerRerunValidator,
];

const byChallenge = new Map(VALIDATORS.map((v) => [v.challengeId, v]));

export function validatorForChallenge(challengeId: string): ValidatorDefinition | undefined {
  return byChallenge.get(challengeId);
}

/** Lessons whose knowledge check is live: completing one requires a correct check. */
export const LESSON_CHECK_IDS: readonly string[] = MISSIONS.flatMap((m) => m.items)
  .filter((i) => i.kind === "lesson" && i.availability.status === "available" && i.knowledgeCheck.length > 0)
  .map((i) => (i.kind === "lesson" ? i.check.validatorId : ""));

/** The registry the progress store trusts when accepting receipts. */
export const ACTIVE_VALIDATORS: ValidatorRegistry = createValidatorRegistry([
  ...VALIDATORS.map((v) => v.validatorId),
  ...LESSON_CHECK_IDS,
]);
