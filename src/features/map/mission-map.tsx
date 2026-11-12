"use client";

import { ArrowRight, List, Lock, Map as MapIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { DifficultyMeter, StatusChip } from "@/components/ui/primitives";
import { catalog } from "@/content/catalog";
import type { DerivedProgress } from "@/domain/progression";
import type { Mission, MissionId } from "@/domain/types";
import { LockedMissionDialog } from "@/features/missions/locked-mission-dialog";
import { summarizeMission } from "@/features/missions/mission-summary";
import { accentStyle, worldVisual, WorldEmblem } from "@/features/worlds/world-visuals";
import { cn } from "@/lib/cn";
import { useSvgId } from "@/lib/use-svg-id";
import { pathBetween, TALL_LAYOUT, WIDE_LAYOUT, type MapLayout } from "./map-layout";
import { MissionBriefing } from "./mission-briefing";
import { MissionNode } from "./mission-node";

const missions = catalog.missions;

/* Deterministic star field so server and client render identical SVG. */
function starField(seed: number, count: number, w: number, h: number) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: count }, () => ({
    x: Math.round(rand() * w),
    y: Math.round(rand() * h),
    r: Math.round((0.6 + rand() * 1.3) * 10) / 10,
    o: Math.round((0.15 + rand() * 0.45) * 100) / 100,
  }));
}
const STARS_WIDE = starField(7, 70, WIDE_LAYOUT.width, WIDE_LAYOUT.height);
const STARS_TALL = starField(11, 60, TALL_LAYOUT.width, TALL_LAYOUT.height);

function MapTerrain({
  layout,
  orientation,
  progress,
}: {
  layout: MapLayout;
  orientation: "wide" | "tall";
  progress: DerivedProgress;
}) {
  const stars = orientation === "wide" ? STARS_WIDE : STARS_TALL;
  const gid = useSvgId(`seg-${orientation}`);
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        {missions.slice(0, -1).map((m, i) => {
          const a = layout.nodes[m.id];
          const b = layout.nodes[missions[i + 1].id];
          return (
            <linearGradient
              key={m.id}
              id={`${gid}-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
            >
              <stop offset="0%" stopColor={worldVisual(m).accent} />
              <stop offset="100%" stopColor={worldVisual(missions[i + 1]).accent} />
            </linearGradient>
          );
        })}
      </defs>

      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#cbd5e1" opacity={s.o} />
      ))}

      {/* Contour "terrain" around each world */}
      {missions.map((m) => {
        const p = layout.nodes[m.id];
        const locked = progress.missions[m.id].status === "locked";
        const color = locked ? "#64748b" : worldVisual(m).accent;
        return (
          <g key={m.id} opacity={locked ? 0.35 : 0.8}>
            <circle cx={p.x} cy={p.y} r={orientation === "wide" ? 120 : 95} fill={color} opacity="0.05" />
            {[72, 96, 122].map((r, k) => (
              <ellipse
                key={r}
                cx={p.x}
                cy={p.y}
                rx={orientation === "wide" ? r : r * 0.8}
                ry={(orientation === "wide" ? r : r * 0.8) * 0.62}
                fill="none"
                stroke={color}
                strokeOpacity={0.16 - k * 0.04}
                strokeWidth="1"
                strokeDasharray={k === 2 ? "2 6" : undefined}
              />
            ))}
          </g>
        );
      })}

      {/* Progression paths */}
      {missions.slice(0, -1).map((m, i) => {
        const next = missions[i + 1];
        const d = pathBetween(layout.nodes[m.id], layout.nodes[next.id], orientation);
        const fromStatus = progress.missions[m.id].status;
        const traveled = fromStatus === "completed" || fromStatus === "cleared";
        const frontier = fromStatus === "available" || fromStatus === "in-progress";
        return (
          <g key={m.id}>
            <path d={d} fill="none" stroke="#0c111d" strokeWidth="14" strokeLinecap="round" />
            <path d={d} fill="none" stroke="rgb(148 163 184 / 0.16)" strokeWidth="2" strokeDasharray="4 8" strokeLinecap="round" />
            {traveled && (
              <motion.path
                d={d}
                fill="none"
                stroke={`url(#${gid}-${i})`}
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, delay: 0.3 + i * 0.15, ease: "easeInOut" }}
              />
            )}
            {frontier && (
              <path
                d={d}
                fill="none"
                stroke={worldVisual(m).accent}
                strokeOpacity="0.55"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                strokeLinecap="round"
                className="animate-dash"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function MapCanvas({
  layout,
  orientation,
  progress,
  selectedId,
  onSelect,
  onPreview,
}: {
  layout: MapLayout;
  orientation: "wide" | "tall";
  progress: DerivedProgress;
  selectedId: MissionId;
  onSelect: (id: MissionId) => void;
  onPreview: (id: MissionId | null) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div
      role="group"
      aria-label="Mission map. Use arrow keys to move between worlds."
      className="relative w-full"
      style={
        {
          aspectRatio: `${layout.width} / ${layout.height}`,
          "--node": orientation === "wide" ? "clamp(64px, 8.4vw, 92px)" : "72px",
        } as React.CSSProperties
      }
    >
      <MapTerrain layout={layout} orientation={orientation} progress={progress} />
      {missions.map((m, i) => (
        <MissionNode
          key={m.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          mission={m}
          index={i}
          progress={progress.missions[m.id]}
          selected={selectedId === m.id}
          isActive={progress.activeMissionId === m.id}
          position={layout.nodes[m.id]}
          layout={layout}
          xpTotal={progress.missions[m.id].xpAvailable}
          onSelect={() => onSelect(m.id)}
          onPreview={(on) => onPreview(on ? m.id : null)}
          onKeyNav={(dir) => {
            const next = (i + dir + missions.length) % missions.length;
            refs.current[next]?.focus();
          }}
        />
      ))}
    </div>
  );
}

function MissionList({
  progress,
  onExplainLock,
}: {
  progress: DerivedProgress;
  onExplainLock: (m: Mission) => void;
}) {
  return (
    <ol className="space-y-3">
      {missions.map((m) => {
        const mp = progress.missions[m.id];
        const s = summarizeMission(m);
        const locked = mp.status === "locked";
        return (
          <li key={m.id} className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center" style={accentStyle(m)}>
            <WorldEmblem mission={m} className={cn("h-12 w-12 shrink-0", locked && "opacity-40 grayscale")} />
            <div className="min-w-0 flex-1">
              <p className="eyebrow">
                {m.worldLabel} · {m.subtitle}
              </p>
              <h3 className="font-display text-base font-semibold">{m.title}</h3>
              <p className="mt-0.5 text-sm text-fg-muted">{m.tagline}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <StatusChip status={mp.status} />
                <DifficultyMeter level={m.difficulty} />
                <span className="text-xs text-fg-muted">{s.totalXp} XP</span>
              </div>
            </div>
            {locked ? (
              <button
                type="button"
                onClick={() => onExplainLock(m)}
                className="inline-flex h-10 items-center gap-2 self-start rounded-xl border border-line-strong px-4 text-sm text-fg-muted hover:text-fg sm:self-center"
              >
                <Lock className="h-4 w-4" aria-hidden="true" /> Why locked?
              </button>
            ) : (
              <Link
                href={`/academy/missions/${m.id}`}
                className="inline-flex h-10 items-center gap-2 self-start rounded-xl bg-white/[0.06] px-4 text-sm font-medium text-fg hover:bg-white/10 sm:self-center"
              >
                Enter <ArrowRight className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{m.title}</span>
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function MissionMap({ progress }: { progress: DerivedProgress }) {
  const [view, setView] = useState<"map" | "list">("map");
  const [selected, setSelected] = useState<MissionId | null>(null);
  const [preview, setPreview] = useState<MissionId | null>(null);
  const [lockedDialog, setLockedDialog] = useState<Mission | null>(null);
  const briefingRef = useRef<HTMLElement>(null);

  const selectedId: MissionId = selected ?? progress.activeMissionId ?? missions[0].id;
  const shownId = preview ?? selectedId;
  const shown = catalog.getMission(shownId)!;

  const select = (id: MissionId) => {
    setSelected(id);
    setPreview(null);
    // On narrow screens the briefing sits below the map; bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      briefingRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <div role="group" aria-label="Map view" className="inline-flex rounded-xl border border-line bg-ink-900/70 p-1">
          {(
            [
              ["map", "Map", MapIcon],
              ["list", "List", List],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition",
                view === key ? "bg-white/[0.08] text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </div>

      {view === "map" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="panel relative self-start overflow-hidden bg-[radial-gradient(ellipse_at_30%_20%,rgb(139_92_246/0.10),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgb(34_211_238/0.08),transparent_55%),#070a12] p-3 sm:p-6">
            <div className="hidden md:block">
              <MapCanvas
                layout={WIDE_LAYOUT}
                orientation="wide"
                progress={progress}
                selectedId={selectedId}
                onSelect={select}
                onPreview={setPreview}
              />
            </div>
            <div className="mx-auto max-w-sm md:hidden">
              <MapCanvas
                layout={TALL_LAYOUT}
                orientation="tall"
                progress={progress}
                selectedId={selectedId}
                onSelect={select}
                onPreview={setPreview}
              />
            </div>
            <MapLegend />
          </div>
          <div className="lg:sticky lg:top-8 lg:self-start">
            <MissionBriefing
              ref={briefingRef}
              mission={shown}
              progress={progress.missions[shown.id]}
              onExplainLock={() => setLockedDialog(shown)}
            />
          </div>
        </div>
      ) : (
        <MissionList progress={progress} onExplainLock={setLockedDialog} />
      )}

      {lockedDialog && (
        <LockedMissionDialog
          mission={lockedDialog}
          progress={progress}
          open
          onClose={() => setLockedDialog(null)}
        />
      )}
    </>
  );
}

function MapLegend() {
  const items = [
    { label: "Unlocked", dot: "bg-cyan" },
    { label: "In progress", dot: "bg-violet" },
    { label: "Cleared", dot: "bg-gold" },
    { label: "Mastered", dot: "bg-emerald" },
    { label: "Locked", dot: "bg-ink-600 ring-1 ring-line-strong" },
  ];
  return (
    <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-fg-muted" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", i.dot)} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
