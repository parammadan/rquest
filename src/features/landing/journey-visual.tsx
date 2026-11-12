"use client";

import { motion } from "motion/react";
import { catalog } from "@/content/catalog";
import { worldVisual, WorldEmblem } from "@/features/worlds/world-visuals";

const POINTS = [
  { x: 70, y: 330 },
  { x: 170, y: 200 },
  { x: 300, y: 270 },
  { x: 390, y: 130 },
  { x: 470, y: 50 },
];

/** Illustrative five-world route for the landing hero (no learner data). */
export function JourneyVisual() {
  const d = POINTS.slice(1).reduce((acc, p, i) => {
    const a = POINTS[i];
    const mx = (a.x + p.x) / 2;
    return `${acc} C ${mx} ${a.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
  }, `M ${POINTS[0].x} ${POINTS[0].y}`);

  return (
    <div className="relative mx-auto aspect-[540/400] w-full max-w-xl" role="img" aria-label="Illustration: a route through the five RQuest worlds, from The Data Lab to the Research Mission.">
      <svg viewBox="0 0 540 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="hero-route" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="35%" stopColor="#a78bfa" />
            <stop offset="60%" stopColor="#fb7185" />
            <stop offset="80%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <radialGradient id="hero-glow">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="270" cy="200" r="220" fill="url(#hero-glow)" />
        {[60, 110, 160, 210].map((r) => (
          <ellipse key={r} cx="270" cy="210" rx={r * 1.25} ry={r * 0.7} fill="none" stroke="rgb(148 163 184 / 0.08)" strokeDasharray="2 7" />
        ))}
        <path d={d} fill="none" stroke="#0c111d" strokeWidth="16" strokeLinecap="round" />
        <motion.path
          d={d}
          fill="none"
          stroke="url(#hero-route)"
          strokeWidth="3.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.2, ease: "easeInOut", delay: 0.3 }}
        />
        <path d={d} fill="none" stroke="rgb(255 255 255 / 0.5)" strokeWidth="1.2" strokeDasharray="2 10" className="animate-dash" />
      </svg>
      {catalog.missions.map((m, i) => {
        const p = POINTS[i];
        const v = worldVisual(m);
        return (
          <motion.div
            key={m.id}
            className="absolute"
            style={{ left: `${(p.x / 540) * 100}%`, top: `${(p.y / 400) * 100}%` }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.35, type: "spring", stiffness: 220, damping: 16 }}
          >
            <div className="-translate-x-1/2 -translate-y-1/2">
              <div
                className="grid h-16 w-16 place-items-center rounded-full border border-white/10 sm:h-[4.5rem] sm:w-[4.5rem]"
                style={{
                  background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${v.accent} 35%, #111827), #0c111d 70%)`,
                  boxShadow: `0 0 40px -8px ${v.accent}`,
                }}
              >
                <WorldEmblem mission={m} className="h-9 w-9 sm:h-10 sm:w-10" />
              </div>
              <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap font-mono text-[0.6rem] uppercase tracking-[0.16em] text-fg-subtle">
                {m.worldLabel}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
