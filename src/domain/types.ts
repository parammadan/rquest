/**
 * RQuest domain model.
 *
 * Everything the academy knows about content (missions, lessons, challenges,
 * achievements) and about a learner (progress events) is described here.
 * The types are framework-free so they can be shared by the UI, tests, and —
 * in later phases — a server API and database.
 */

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

export type MissionId =
  | "data-lab"
  | "package-factory"
  | "debugging-crisis"
  | "quality-control"
  | "research-mission";

/** 1 = foundational … 5 = expert. */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

/** The delivery phase a feature is planned for. */
export type DeliveryPhase = 1 | 2 | 3;

/**
 * Availability is explicit so the UI can never present an unbuilt feature
 * as usable. Only `available` items can ever produce completion events.
 */
export type Availability =
  | { status: "available" }
  | { status: "planned"; phase: DeliveryPhase; note: string };

export type VideoStatus = "planned" | "generating" | "ready";

/** Metadata for an instructional video (generated in Phase 3). */
export interface VideoMetadata {
  id: string;
  title: string;
  /** Planned running time in seconds. */
  plannedDurationSec: number;
  status: VideoStatus;
  /** Populated only when status === "ready". */
  src: string | null;
  posterSrc: string | null;
  transcriptSrc: string | null;
  /** Beats the generated video will cover, in order. */
  outline: string[];
}

export interface Lesson {
  id: string;
  kind: "lesson";
  missionId: MissionId;
  title: string;
  summary: string;
  estimatedMinutes: number;
  xp: number;
  video: VideoMetadata;
  /** Validator that confirms the lesson's comprehension check (Phase 3). */
  check: { validatorId: string };
  availability: Availability;
}

export type ChallengeType =
  | "code-exercise"
  | "debugging"
  | "test-writing"
  | "package-check"
  | "boss";

/**
 * How a challenge will be evaluated once execution exists.
 * `validatorId` links a challenge to exactly one validator; a completion
 * receipt is only accepted when it names this validator.
 */
export interface EvaluationSpec {
  runtime: "webr";
  strategy:
    | "output-match"
    | "testthat-suite"
    | "package-checks"
    | "mutation-testing"
    | "reproducibility-diff";
  validatorId: string;
}

export interface Challenge {
  id: string;
  kind: "challenge";
  missionId: MissionId;
  type: ChallengeType;
  title: string;
  summary: string;
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
  xp: number;
  /** What the learner must do, shown in the challenge workspace. */
  instructions: string[];
  /** The code the editor starts with. */
  starterCode: string;
  /** webR packages installed before the code runs. */
  packages: string[];
  evaluation: EvaluationSpec;
  availability: Availability;
}

export type MissionItem = Lesson | Challenge;

export interface MissionTheme {
  /** Key into the presentation layer's visual registry. */
  visual: "lab" | "factory" | "crisis" | "qc" | "research";
  accent: "cyan" | "violet" | "coral" | "emerald" | "gold";
}

export interface Mission {
  id: MissionId;
  order: number;
  worldLabel: string;
  title: string;
  subtitle: string;
  tagline: string;
  story: string[];
  objectives: string[];
  difficulty: DifficultyLevel;
  estimatedHours: number;
  /** Missions that must be completed before this one unlocks. */
  requires: MissionId[];
  /** Ordered: lessons and challenges interleaved, boss last. */
  items: MissionItem[];
  /** Achievement awarded for completing this mission. */
  rewardAchievementId: string;
  theme: MissionTheme;
}

/* ------------------------------------------------------------------ */
/* Achievements                                                        */
/* ------------------------------------------------------------------ */

export type AchievementCriterion =
  | { type: "items-completed"; count: number }
  /** Every challenge and the boss of a world validated. */
  | { type: "mission-cleared"; missionId: MissionId }
  | { type: "bosses-defeated"; count: number }
  | { type: "xp-earned"; amount: number };

export interface Achievement {
  id: string;
  title: string;
  description: string;
  criterion: AchievementCriterion;
  /** Human-readable unlock rule shown to learners. */
  criterionLabel: string;
  emblem:
    | "footprints"
    | "flask"
    | "package"
    | "bug"
    | "shield"
    | "telescope"
    | "swords"
    | "crown";
  tier: "bronze" | "silver" | "gold";
}

/* ------------------------------------------------------------------ */
/* Learner progress (event-sourced)                                    */
/* ------------------------------------------------------------------ */

/**
 * Proof that an item was validated. Produced only by a registered
 * validator after a WebR evaluation passes; never by UI interactions.
 */
export interface ValidationReceipt {
  validatorId: string;
  verdict: "passed";
  checkedAt: string;
  /** Optional digest of the evidence (e.g. hash of the evaluated output). */
  evidenceDigest?: string;
}

/** The only event type that can change progress. */
export interface ItemCompletedEvent {
  id: string;
  type: "item.completed";
  itemId: string;
  itemKind: MissionItem["kind"];
  missionId: MissionId;
  occurredAt: string;
  receipt: ValidationReceipt;
}

export type ProgressEvent = ItemCompletedEvent;

/** Where a snapshot came from. Seeded data is never shown as real. */
export type ProgressOrigin = "learner" | "dev-scenario";

export interface ProgressSnapshot {
  schemaVersion: 1;
  learnerId: string;
  origin: ProgressOrigin;
  /** Set when origin === "dev-scenario". */
  scenarioName?: string;
  events: ProgressEvent[];
}

/** An XP award derived from a completion event (never stored directly). */
export interface XpEvent {
  id: string;
  sourceEventId: string;
  itemId: string;
  itemTitle: string;
  missionId: MissionId;
  amount: number;
  awardedAt: string;
}

/**
 * cleared   = every challenge and the boss validated (unlocks the next world)
 * completed = every item validated, lessons included (full mastery)
 */
export type MissionStatus = "locked" | "available" | "in-progress" | "cleared" | "completed";

export type ItemCompletionState = "completed" | "open" | "planned";
