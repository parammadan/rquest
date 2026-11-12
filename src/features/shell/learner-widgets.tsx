"use client";

import { Hydrated, ProgressBar } from "@/components/ui/primitives";
import type { LevelInfo } from "@/domain/levels";
import { useProgress } from "@/features/progress/progress-provider";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useSvgId } from "@/lib/use-svg-id";

/** Hexagonal level badge. */
export function LevelIndicator({
  level,
  size = "md",
  className,
}: {
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const gid = useSvgId("lvl");
  const dims = { sm: "h-9 w-9 text-sm", md: "h-12 w-12 text-lg", lg: "h-20 w-20 text-3xl" }[size];
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", dims, className)}>
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <path d="M24 2 43 13v22L24 46 5 35V13Z" fill="#111827" stroke={`url(#${gid})`} strokeWidth="2" />
      </svg>
      <span className="relative font-display font-bold text-fg">
        <span className="sr-only">Level </span>
        {level}
      </span>
    </span>
  );
}

export function XPProgressBar({
  level,
  ready,
  compact = false,
}: {
  level: LevelInfo;
  ready: boolean;
  compact?: boolean;
}) {
  const next = level.nextLevelXp;
  const valueText = next
    ? `${level.totalXp} of ${next} XP toward level ${level.level + 1}`
    : `${level.totalXp} XP, maximum level`;
  return (
    <div className="w-full">
      <ProgressBar
        value={ready ? level.fraction : 0}
        label="Experience toward next level"
        valueText={valueText}
        size={compact ? "sm" : "md"}
      />
      <div className={cn("mt-1.5 flex justify-between font-mono text-fg-subtle", compact ? "text-[0.65rem]" : "text-xs")}>
        <span>
          <Hydrated ready={ready}>{formatNumber(level.totalXp)}</Hydrated>
          {compact && next ? ` / ${formatNumber(next)}` : ""} XP
        </span>
        <span>
          {next ? (compact ? `Lv ${level.level + 1}` : `${formatNumber(next)} XP · Lv ${level.level + 1}`) : "Max level"}
        </span>
      </div>
    </div>
  );
}

/** Compact learner card used in the sidebar and header. */
export function LearnerCard({ compact = false }: { compact?: boolean }) {
  const { ready, progress } = useProgress();
  const { level } = progress;
  return (
    <div className={cn("flex items-center gap-3", compact ? "" : "panel p-3")}>
      <LevelIndicator level={level.level} size={compact ? "sm" : "md"} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">Demo Learner</p>
        <p className="truncate text-xs text-fg-muted">{level.title}</p>
        {!compact && (
          <div className="mt-2">
            <XPProgressBar level={level} ready={ready} compact />
          </div>
        )}
      </div>
    </div>
  );
}
