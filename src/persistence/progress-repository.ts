/**
 * Progress persistence boundary.
 *
 * Progress is stored as an event log in browser storage. A later phase swaps in a
 * server-backed implementation of the same interface without touching the UI.
 */
import { emptySnapshot } from "../domain/progression.ts";
import type {
  ItemCompletedEvent,
  ProgressEvent,
  ProgressSnapshot,
} from "../domain/types.ts";

export interface ProgressRepository {
  /** Must return the same object until the data changes (for React). */
  read(): ProgressSnapshot;
  append(event: ProgressEvent): void;
  reset(): void;
  subscribe(listener: () => void): () => void;
}

/** Minimal subset of the Web Storage API (lets tests pass a fake). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const PROGRESS_STORAGE_KEY = "rquest:progress:v1";

/* ---------- structural validation of untrusted stored JSON ---------- */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isWellFormedEvent(v: unknown): v is ItemCompletedEvent {
  if (!isRecord(v)) return false;
  const r = v.receipt;
  return (
    v.type === "item.completed" &&
    typeof v.id === "string" &&
    typeof v.itemId === "string" &&
    (v.itemKind === "lesson" || v.itemKind === "challenge") &&
    typeof v.missionId === "string" &&
    typeof v.occurredAt === "string" &&
    isRecord(r) &&
    typeof r.validatorId === "string" &&
    r.verdict === "passed" &&
    typeof r.checkedAt === "string"
  );
}

/** Parse stored JSON; anything malformed falls back to an empty snapshot. */
export function parseSnapshot(
  raw: string | null,
  origin: ProgressSnapshot["origin"] = "learner",
): ProgressSnapshot {
  const fallback = { ...emptySnapshot(), origin };
  if (!raw) return fallback;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.schemaVersion !== 1 || !Array.isArray(data.events)) {
      return fallback;
    }
    return {
      schemaVersion: 1,
      learnerId: typeof data.learnerId === "string" ? data.learnerId : fallback.learnerId,
      origin,
      scenarioName:
        origin === "dev-scenario" && typeof data.scenarioName === "string"
          ? data.scenarioName
          : undefined,
      events: data.events.filter(isWellFormedEvent),
    };
  } catch {
    return fallback;
  }
}

/* ------------------------- implementations -------------------------- */

export function createStorageRepository(
  storage: KeyValueStorage,
  key: string = PROGRESS_STORAGE_KEY,
  origin: ProgressSnapshot["origin"] = "learner",
): ProgressRepository & { invalidate(): void } {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cached: ProgressSnapshot | undefined;

  const safeGet = () => {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  };
  const notify = () => listeners.forEach((l) => l());

  function read(): ProgressSnapshot {
    const raw = safeGet();
    if (cached && raw === cachedRaw) return cached;
    cachedRaw = raw;
    cached = parseSnapshot(raw, origin);
    return cached;
  }

  function write(next: ProgressSnapshot) {
    const raw = JSON.stringify(next);
    try {
      storage.setItem(key, raw);
    } catch {
      // Storage full or blocked: keep the in-memory copy for this session.
    }
    cachedRaw = raw;
    cached = next;
    notify();
  }

  return {
    read,
    append(event) {
      const current = read();
      write({ ...current, events: [...current.events, event] });
    },
    reset() {
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
      cachedRaw = undefined;
      cached = undefined;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Call when another tab changed storage. */
    invalidate() {
      cachedRaw = undefined;
      cached = undefined;
      notify();
    },
  };
}

export function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}
