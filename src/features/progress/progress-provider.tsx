"use client";

import { createContext, use, useEffect, useState, useSyncExternalStore } from "react";
import { DEV_SCENARIO_STORAGE_KEY, DEV_TOOLS_ENABLED } from "./dev-scenarios";
import {
  createBrowserProgressStore,
  createProgressStore,
  type ProgressState,
  type ProgressStore,
} from "./progress-store";
import { createMemoryStorage, PROGRESS_STORAGE_KEY } from "@/persistence/progress-repository";

const StoreContext = createContext<ProgressStore | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() =>
    typeof window === "undefined"
      ? createProgressStore({ storage: createMemoryStorage(), devToolsEnabled: false })
      : createBrowserProgressStore(DEV_TOOLS_ENABLED),
  );

  // Keep tabs in sync when another tab changes progress.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === PROGRESS_STORAGE_KEY || e.key === DEV_SCENARIO_STORAGE_KEY) {
        (store as ProgressStore & { invalidate?: () => void }).invalidate?.();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [store]);

  return <StoreContext value={store}>{children}</StoreContext>;
}

function useStore(): ProgressStore {
  const store = use(StoreContext);
  if (!store) throw new Error("useProgress must be used inside <ProgressProvider>");
  return store;
}

/**
 * Current learner progress. During SSR and hydration `ready` is false and the
 * empty state is returned, so server and client markup always match.
 */
export function useProgress(): ProgressState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

/**
 * Records a completion backed by a validation receipt. Only the challenge
 * workspace uses this, after a webR evaluation passed every check.
 */
export function useRecordValidatedCompletion() {
  return useStore().submit;
}

export function useProgressActions() {
  const store = useStore();
  return {
    resetLearnerProgress: store.resetLearnerProgress,
    loadScenario: store.loadScenario,
    exitScenario: store.exitScenario,
  };
}
