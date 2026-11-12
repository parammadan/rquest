import { catalog as defaultCatalog, type Catalog } from "../../content/catalog.ts";
import { ACTIVE_VALIDATORS } from "../../content/validators/index.ts";
import {
  submitCompletion,
  type SubmitResult,
  type ValidatorRegistry,
} from "../../domain/completion.ts";
import {
  deriveProgress,
  emptySnapshot,
  type DerivedProgress,
} from "../../domain/progression.ts";
import { buildAttempt, type AttemptInput, type AttemptResult } from "../../domain/attempts.ts";
import type { ProgressSnapshot, ValidationReceipt } from "../../domain/types.ts";
import {
  createMemoryStorage,
  createStorageRepository,
  LEGACY_PROGRESS_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
  type KeyValueStorage,
} from "../../persistence/progress-repository.ts";
import {
  buildScenarioSnapshot,
  DEV_SCENARIO_STORAGE_KEY,
  DEV_SCENARIOS,
} from "./dev-scenarios.ts";

export interface ProgressState {
  /** false during SSR and the first hydration pass. */
  ready: boolean;
  snapshot: ProgressSnapshot;
  progress: DerivedProgress;
}

export interface ProgressStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): ProgressState;
  getServerSnapshot(): ProgressState;
  submit(itemId: string, receipt: ValidationReceipt): SubmitResult;
  /** Record learning evidence for one graded submission (never awards XP). */
  recordAttempt(input: Omit<AttemptInput, "now" | "newId">): AttemptResult;
  resetLearnerProgress(): void;
  loadScenario(id: string): boolean;
  exitScenario(): void;
}

export interface StoreOptions {
  storage: KeyValueStorage;
  catalog?: Catalog;
  validators?: ValidatorRegistry;
  devToolsEnabled: boolean;
}

export function createProgressStore(opts: StoreOptions): ProgressStore & {
  invalidate(): void;
} {
  const catalog = opts.catalog ?? defaultCatalog;
  const validators = opts.validators ?? ACTIVE_VALIDATORS;
  const learner = createStorageRepository(opts.storage, {
    key: PROGRESS_STORAGE_KEY,
    origin: "learner",
    legacyKey: LEGACY_PROGRESS_STORAGE_KEY,
  });
  const scenario = createStorageRepository(opts.storage, { key: DEV_SCENARIO_STORAGE_KEY, origin: "dev-scenario" });

  const serverState: ProgressState = {
    ready: false,
    snapshot: emptySnapshot(),
    progress: deriveProgress(emptySnapshot(), catalog),
  };

  const activeSnapshot = () => {
    if (opts.devToolsEnabled) {
      const s = scenario.read();
      if (s.scenarioName) return s;
    }
    return learner.read();
  };

  let lastSnapshot: ProgressSnapshot | null = null;
  let lastState: ProgressState | null = null;

  return {
    subscribe(listener) {
      const a = learner.subscribe(listener);
      const b = scenario.subscribe(listener);
      return () => {
        a();
        b();
      };
    },
    getSnapshot() {
      const snap = activeSnapshot();
      if (snap !== lastSnapshot || !lastState) {
        lastSnapshot = snap;
        lastState = { ready: true, snapshot: snap, progress: deriveProgress(snap, catalog) };
      }
      return lastState;
    },
    getServerSnapshot: () => serverState,
    submit(itemId, receipt) {
      // Completions only ever go to the real learner log.
      const result = submitCompletion(learner.read(), catalog, validators, {
        itemId,
        receipt,
      });
      if (result.ok && !learner.append(result.event)) return { ok: false, reason: "storage-unavailable" };
      return result;
    },
    recordAttempt(input) {
      // Attempts, like completions, only ever go to the real learner log.
      const result = buildAttempt(learner.read(), catalog, input);
      if (result.ok) learner.append(result.event);
      return result;
    },
    resetLearnerProgress: () => learner.reset(),
    loadScenario(id) {
      if (!opts.devToolsEnabled) return false;
      const def = DEV_SCENARIOS.find((s) => s.id === id);
      if (!def) return false;
      const snap = buildScenarioSnapshot(def, catalog);
      try {
        opts.storage.setItem(DEV_SCENARIO_STORAGE_KEY, JSON.stringify(snap));
      } catch {
        return false;
      }
      scenario.invalidate();
      return true;
    },
    exitScenario: () => scenario.reset(),
    invalidate() {
      learner.invalidate();
      scenario.invalidate();
    },
  };
}

/** Browser store, or an in-memory one when storage is unavailable. */
export function createBrowserProgressStore(devToolsEnabled: boolean) {
  let storage: KeyValueStorage;
  try {
    storage = window.localStorage;
    const probe = "rquest:probe";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
  } catch {
    storage = createMemoryStorage();
  }
  return createProgressStore({ storage, devToolsEnabled });
}
