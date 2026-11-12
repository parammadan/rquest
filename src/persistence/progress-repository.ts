/**
 * Progress persistence boundary.
 *
 * Progress is stored as an event log in browser storage. A later phase swaps in a
 * server-backed implementation of the same interface without touching the UI.
 *
 * Schema history
 * - v1 (key rquest:progress:v1): item.completed events only.
 * - v2 (key rquest:progress:v2): adds challenge.attempted learning evidence.
 *
 * Migration rules (learner progress)
 * - v1 data is never rewritten or deleted (except by an explicit reset). A browser tab
 *   still running the previous release keeps reading and writing v1 safely.
 * - On read, completions in v1 that v2 doesn't have yet (matched by event id) are merged
 *   in. That migrates a v1-only learner on first load and picks up anything a stale tab
 *   recorded afterwards. Nothing is invented: v1 completions get no attempt history.
 * - v2 data that can't be read (corrupt JSON, unknown schema version) is never
 *   overwritten: writes are refused and the snapshot reports a storageIssue until the
 *   learner resets.
 * - Events this version doesn't understand are kept, unchanged, on every write.
 */
import { emptySnapshot } from "../domain/progression.ts";
import type {
  AttemptOutcome,
  ChallengeAttemptedEvent,
  ItemCompletedEvent,
  ProgressEvent,
  ProgressSnapshot,
  StorageIssue,
} from "../domain/types.ts";

export interface ProgressRepository {
  /** Must return the same object until the data changes (for React). */
  read(): ProgressSnapshot;
  /** Returns false when the event could not be stored (unreadable data is never overwritten). */
  append(event: ProgressEvent): boolean;
  reset(): void;
  subscribe(listener: () => void): () => void;
}

/** Minimal subset of the Web Storage API (lets tests pass a fake). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const PROGRESS_STORAGE_KEY = "rquest:progress:v2";
/** Schema v1 location. Read for migration; never written by this version. */
export const LEGACY_PROGRESS_STORAGE_KEY = "rquest:progress:v1";
export const SCHEMA_VERSION = 2;

/* ---------- structural validation of untrusted stored JSON ---------- */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isWellFormedCompletion(v: unknown): v is ItemCompletedEvent {
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

const OUTCOMES: readonly AttemptOutcome[] = ["passed", "failed", "syntax-error", "runtime-error", "timeout", "integrity"];

export function isWellFormedAttempt(v: unknown): v is ChallengeAttemptedEvent {
  if (!isRecord(v)) return false;
  return (
    v.type === "challenge.attempted" &&
    typeof v.id === "string" &&
    typeof v.itemId === "string" &&
    typeof v.missionId === "string" &&
    typeof v.occurredAt === "string" &&
    Number.isInteger(v.attempt) &&
    (v.attempt as number) >= 1 &&
    OUTCOMES.includes(v.outcome as AttemptOutcome) &&
    Array.isArray(v.failedCheckIds) &&
    v.failedCheckIds.every((x) => typeof x === "string") &&
    typeof v.activeMs === "number" &&
    Number.isFinite(v.activeMs) &&
    v.activeMs >= 0
  );
}

export function isWellFormedEvent(v: unknown): v is ProgressEvent {
  return isWellFormedCompletion(v) || isWellFormedAttempt(v);
}

interface Parsed {
  snapshot: ProgressSnapshot;
  /** Every stored event, including ones this version doesn't understand (kept on write). */
  rawEvents: unknown[];
}

/**
 * Parse stored JSON (schema v1 or v2). Missing data gives an empty snapshot;
 * unreadable data gives an empty snapshot with storageIssue set.
 */
export function parseStored(raw: string | null, origin: ProgressSnapshot["origin"] = "learner"): Parsed {
  const fallback = (storageIssue?: StorageIssue): Parsed => ({
    snapshot: { ...emptySnapshot(), origin, ...(storageIssue ? { storageIssue } : {}) },
    rawEvents: [],
  });
  if (!raw) return fallback();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fallback("unreadable");
  }
  if (!isRecord(data) || !Array.isArray(data.events)) return fallback("unreadable");
  if (data.schemaVersion !== 1 && data.schemaVersion !== 2) return fallback("unsupported-version");
  // v1 can only hold completions; anything else in a v1 log is ignored.
  const valid = data.schemaVersion === 1 ? isWellFormedCompletion : isWellFormedEvent;
  return {
    snapshot: {
      schemaVersion: 2,
      learnerId: typeof data.learnerId === "string" ? data.learnerId : emptySnapshot().learnerId,
      origin,
      scenarioName: origin === "dev-scenario" && typeof data.scenarioName === "string" ? data.scenarioName : undefined,
      events: data.events.filter(valid),
    },
    rawEvents: data.events,
  };
}

/** Parse stored JSON into a snapshot (see parseStored). */
export function parseSnapshot(raw: string | null, origin: ProgressSnapshot["origin"] = "learner"): ProgressSnapshot {
  return parseStored(raw, origin).snapshot;
}

/* ------------------------- implementations -------------------------- */

export interface RepositoryOptions {
  key?: string;
  origin?: ProgressSnapshot["origin"];
  /** Schema v1 key to migrate from (learner progress only). */
  legacyKey?: string | null;
}

export function createStorageRepository(
  storage: KeyValueStorage,
  { key = PROGRESS_STORAGE_KEY, origin = "learner", legacyKey = null }: RepositoryOptions = {},
): ProgressRepository & { invalidate(): void } {
  const listeners = new Set<() => void>();
  let cacheKey: string | undefined;
  let cached: { snapshot: ProgressSnapshot; rawEvents: unknown[] } | undefined;

  const safeGet = (k: string) => {
    try {
      return storage.getItem(k);
    } catch {
      return null;
    }
  };
  const notify = () => listeners.forEach((l) => l());

  function load() {
    const raw = safeGet(key);
    const legacyRaw = legacyKey ? safeGet(legacyKey) : null;
    const signature = `${raw}\u0000${legacyRaw}`;
    if (cached && signature === cacheKey) return cached;
    const current = parseStored(raw, origin);
    let { snapshot } = current;
    let rawEvents = current.rawEvents;
    if (!snapshot.storageIssue && legacyRaw) {
      const legacy = parseStored(legacyRaw, origin).snapshot;
      const have = new Set(snapshot.events.map((e) => e.id));
      const missing = legacy.events.filter((e) => !have.has(e.id));
      if (missing.length) {
        snapshot = {
          ...snapshot,
          learnerId: raw ? snapshot.learnerId : legacy.learnerId,
          events: [...snapshot.events, ...missing],
        };
        rawEvents = [...rawEvents, ...missing];
      }
    }
    cacheKey = signature;
    cached = { snapshot, rawEvents };
    return cached;
  }

  return {
    read: () => load().snapshot,
    append(event) {
      const { snapshot, rawEvents } = load();
      if (snapshot.storageIssue) return false;
      const next = {
        schemaVersion: SCHEMA_VERSION,
        learnerId: snapshot.learnerId,
        ...(snapshot.scenarioName ? { scenarioName: snapshot.scenarioName } : {}),
        events: [...rawEvents, event],
      };
      try {
        storage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage full or blocked: keep the in-memory copy for this session.
        cached = {
          snapshot: { ...snapshot, events: [...snapshot.events, event] },
          rawEvents: next.events,
        };
        notify();
        return true;
      }
      cacheKey = undefined;
      cached = undefined;
      notify();
      return true;
    },
    reset() {
      for (const k of [key, legacyKey]) {
        if (!k) continue;
        try {
          storage.removeItem(k);
        } catch {
          /* ignore */
        }
      }
      cacheKey = undefined;
      cached = undefined;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Call when another tab changed storage. */
    invalidate() {
      cacheKey = undefined;
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
