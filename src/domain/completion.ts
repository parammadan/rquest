/**
 * The write-side gate for progress.
 *
 * The UI cannot award XP. It can only hand a ValidationReceipt to
 * `submitCompletion`, which accepts it when:
 *   1. the item exists and is `available` (not a planned placeholder),
 *   2. a validator with the receipt's id is registered,
 *   3. the receipt names the validator the item declares,
 *   4. the item has not already been completed (no duplicate XP), and
 *   5. the item's mission is unlocked.
 *
 * Validators are registered in content/validators. Only the challenge
 * workspace calls submit, after a WebR evaluation passed every check.
 */
import type { Catalog } from "../content/catalog.ts";
import { checkEvent, deriveProgress, type RejectionReason } from "./progression.ts";
import type {
  ItemCompletedEvent,
  ProgressSnapshot,
  ValidationReceipt,
} from "./types.ts";

export interface ValidatorRegistry {
  has(validatorId: string): boolean;
}

export function createValidatorRegistry(ids: Iterable<string>): ValidatorRegistry {
  const set = new Set(ids);
  return { has: (id) => set.has(id) };
}

/** An empty registry: nothing can be validated (used by tests). */
export const NO_VALIDATORS: ValidatorRegistry = createValidatorRegistry([]);

export type SubmitResult =
  | { ok: true; event: ItemCompletedEvent }
  | {
      ok: false;
      reason: RejectionReason | "item-not-available" | "validator-unavailable";
    };

export interface SubmitInput {
  itemId: string;
  receipt: ValidationReceipt;
  now?: () => Date;
  newId?: () => string;
}

export function submitCompletion(
  snapshot: ProgressSnapshot,
  catalog: Catalog,
  validators: ValidatorRegistry,
  input: SubmitInput,
): SubmitResult {
  const item = catalog.getItem(input.itemId);
  if (!item) return { ok: false, reason: "unknown-item" };
  if (item.availability.status !== "available") {
    return { ok: false, reason: "item-not-available" };
  }
  if (!validators.has(input.receipt.validatorId)) {
    return { ok: false, reason: "validator-unavailable" };
  }
  const now = (input.now ?? (() => new Date()))();
  const event: ItemCompletedEvent = {
    id: (input.newId ?? defaultId)(),
    type: "item.completed",
    itemId: item.id,
    itemKind: item.kind,
    missionId: item.missionId,
    occurredAt: now.toISOString(),
    receipt: input.receipt,
  };
  const derived = deriveProgress(snapshot, catalog);
  const reason = checkEvent(event, catalog, derived.completedItemIds);
  if (reason) return { ok: false, reason };
  return { ok: true, event };
}

function defaultId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `evt-${Date.now()}-${Math.random()}`;
}
