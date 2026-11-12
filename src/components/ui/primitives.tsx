import { CircleCheck, Flag, Hourglass, Lock, Play } from "lucide-react";
import type { DeliveryPhase, DifficultyLevel, MissionStatus } from "@/domain/types";
import { cn } from "@/lib/cn";

/* ---------------------------- Progress bar ---------------------------- */

export function ProgressBar({
  value,
  label,
  className,
  tone = "spectrum",
  size = "md",
  valueText,
}: {
  /** 0..1 */
  value: number;
  label: string;
  className?: string;
  tone?: "spectrum" | "accent";
  size?: "sm" | "md";
  valueText?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={valueText ?? `${pct}%`}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-ink-700/80 ring-1 ring-inset ring-white/5",
        size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          tone === "spectrum"
            ? "bg-[linear-gradient(90deg,#a78bfa,#22d3ee,#34d399)]"
            : "bg-[var(--accent,#22d3ee)]",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ------------------------------ Chips ------------------------------ */

export function PhaseChip({ phase, className }: { phase: DeliveryPhase; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.68rem] font-medium uppercase tracking-wider",
        phase === 2
          ? "border-cyan/30 bg-cyan/10 text-cyan"
          : "border-violet/30 bg-violet/10 text-violet",
        className,
      )}
    >
      <Hourglass className="h-3 w-3" aria-hidden="true" />
      In production
    </span>
  );
}

const STATUS_META: Record<
  MissionStatus,
  { label: string; icon: typeof Lock; cls: string }
> = {
  locked: { label: "Locked", icon: Lock, cls: "border-line-strong bg-ink-750 text-fg-muted" },
  available: { label: "Unlocked", icon: Play, cls: "border-cyan/35 bg-cyan/10 text-cyan" },
  "in-progress": { label: "In progress", icon: Play, cls: "border-violet/35 bg-violet/10 text-violet" },
  cleared: { label: "Cleared", icon: Flag, cls: "border-gold/35 bg-gold/10 text-gold" },
  completed: { label: "Mastered", icon: CircleCheck, cls: "border-emerald/35 bg-emerald/10 text-emerald" },
};

export function StatusChip({ status, className }: { status: MissionStatus; className?: string }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        m.cls,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {m.label}
    </span>
  );
}

export const STATUS_LABEL = (s: MissionStatus) => STATUS_META[s].label;

/* --------------------------- Difficulty --------------------------- */

const DIFFICULTY_NAMES = ["Foundational", "Intermediate", "Advanced", "Expert", "Master"];

export function difficultyName(d: DifficultyLevel) {
  return DIFFICULTY_NAMES[d - 1];
}

export function DifficultyMeter({
  level,
  className,
  showLabel = true,
}: {
  level: DifficultyLevel;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex items-end gap-[3px]" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              "w-1.5 rounded-sm",
              i <= level ? "bg-[var(--accent,#a78bfa)]" : "bg-ink-600",
            )}
            style={{ height: `${6 + i * 2.5}px` }}
          />
        ))}
      </span>
      <span className="sr-only">Difficulty {level} of 5{showLabel ? ":" : ""}</span>
      {showLabel && <span className="text-xs text-fg-muted">{difficultyName(level)}</span>}
    </span>
  );
}

/* ---------------------------- Skeleton ---------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block animate-shimmer rounded-md bg-ink-700", className)}
    />
  );
}

/** Renders `children` once progress is loaded, a skeleton before. */
export function Hydrated({
  ready,
  children,
  className,
}: {
  ready: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (!ready) return <Skeleton className={cn("h-[1em] w-12 align-middle", className)} />;
  return <>{children}</>;
}

/* ------------------------- Section heading ------------------------- */

export function SectionHeading({
  eyebrow,
  title,
  action,
  id,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 id={id} className="font-display text-lg font-semibold tracking-tight text-fg">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
