"use client";

import { Check, Lock } from "lucide-react";
import { motion } from "motion/react";
import { forwardRef } from "react";
import type { MissionProgress } from "@/domain/progression";
import type { Mission } from "@/domain/types";
import { STATUS_LABEL } from "@/components/ui/primitives";
import { accentStyle, WorldEmblem } from "@/features/worlds/world-visuals";
import { cn } from "@/lib/cn";
import type { MapLayout } from "./map-layout";

interface Props {
  mission: Mission;
  progress: MissionProgress;
  index: number;
  selected: boolean;
  isActive: boolean;
  position: MapLayout["nodes"][keyof MapLayout["nodes"]];
  layout: MapLayout;
  xpTotal: number;
  onSelect: () => void;
  onPreview: (on: boolean) => void;
  onKeyNav: (dir: 1 | -1) => void;
}

const LABEL_POS = {
  below: "top-full mt-3 left-1/2 -translate-x-1/2 text-center items-center",
  above: "bottom-full mb-3 left-1/2 -translate-x-1/2 text-center items-center",
  right: "left-full ml-3 top-1/2 -translate-y-1/2 text-left items-start",
  left: "right-full mr-3 top-1/2 -translate-y-1/2 text-right items-end",
} as const;

export const MissionNode = forwardRef<HTMLButtonElement, Props>(function MissionNode(
  { mission, progress, index, selected, isActive, position, layout, xpTotal, onSelect, onPreview, onKeyNav },
  ref,
) {
  const { status } = progress;
  const locked = status === "locked";
  const pct = Math.round(progress.fraction * 100);
  const circumference = 2 * Math.PI * 46;

  return (
    <div
      className="absolute"
      style={{
        left: `${(position.x / layout.width) * 100}%`,
        top: `${(position.y / layout.height) * 100}%`,
        ...accentStyle(mission),
      }}
    >
      <motion.div
        className="relative -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 + index * 0.09, type: "spring", stiffness: 260, damping: 20 }}
      >
        <button
          ref={ref}
          type="button"
          onClick={onSelect}
          onMouseEnter={() => onPreview(true)}
          onMouseLeave={() => onPreview(false)}
          onFocus={() => onPreview(true)}
          onBlur={() => onPreview(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              onKeyNav(1);
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              onKeyNav(-1);
            }
          }}
          aria-pressed={selected}
          aria-label={`${mission.worldLabel}: ${mission.title} — ${mission.subtitle}. ${STATUS_LABEL(status)}. Difficulty ${mission.difficulty} of 5. ${xpTotal} XP available.${locked ? " Select to see what unlocks it." : ""}`}
          className={cn(
            "group relative grid h-[var(--node)] w-[var(--node)] place-items-center rounded-full outline-none transition-transform duration-300",
            "hover:scale-[1.06] focus-visible:scale-[1.06]",
            "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan",
          )}
        >
          {/* Halo */}
          <span
            aria-hidden="true"
            className={cn(
              "absolute -inset-5 rounded-full opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-60 group-focus-visible:opacity-60",
              selected && "opacity-70",
            )}
            style={{ background: locked ? "rgb(148 163 184 / 0.18)" : "var(--accent)" }}
          />
          {/* Pulse for the active / start node */}
          {isActive && (status === "available" || status === "in-progress") && (
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-[var(--accent)]"
            />
          )}
          {/* Orbit ring + progress arc */}
          <svg viewBox="0 0 100 100" className="absolute -inset-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)] -rotate-90" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke={locked ? "rgb(148 163 184 / 0.22)" : "var(--accent)"}
              strokeOpacity={locked ? 1 : 0.28}
              strokeWidth="2"
              strokeDasharray={locked ? "3 5" : undefined}
            />
            {!locked && pct > 0 && (
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke={status === "completed" ? "#34d399" : status === "cleared" ? "#fbbf24" : "var(--accent)"}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
              />
            )}
          </svg>
          {/* Planet body */}
          <span
            className={cn(
              "relative grid h-full w-full place-items-center rounded-full border transition",
              locked
                ? "border-line-strong bg-ink-800"
                : "border-white/15 bg-[radial-gradient(circle_at_35%_30%,color-mix(in_oklab,var(--accent)_35%,#111827),#0c111d_70%)]",
              selected && "ring-2 ring-[var(--accent)] ring-offset-4 ring-offset-ink-950",
            )}
          >
            <WorldEmblem
              mission={mission}
              className={cn("h-[58%] w-[58%] transition", locked && "opacity-35 grayscale")}
            />
          </span>
          {/* Status badge */}
          {(locked || progress.cleared) && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full border-2 border-ink-950",
                locked ? "bg-ink-600 text-fg-muted" : status === "completed" ? "bg-emerald text-ink-950" : "bg-gold text-ink-950",
              )}
            >
              {locked ? <Lock className="h-3.5 w-3.5" /> : <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
          )}
        </button>

        {/* Label (decorative duplicate of the accessible name) */}
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute flex w-48 flex-col gap-0.5", LABEL_POS[position.labelSide])}
        >
          <span className={cn("font-mono text-[0.62rem] uppercase tracking-[0.18em]", locked ? "text-fg-subtle" : "text-[var(--accent)]")}>
            {mission.worldLabel}
            {status === "in-progress" ? " · In progress" : isActive && status === "available" ? " · Start here" : ""}
          </span>
          <span className={cn("font-display text-sm font-semibold leading-tight", locked ? "text-fg-muted" : "text-fg")}>
            {mission.title}
          </span>
          <span className="text-[0.7rem] text-fg-subtle">
            {mission.subtitle} · {xpTotal} XP
          </span>
        </div>
      </motion.div>
    </div>
  );
});
