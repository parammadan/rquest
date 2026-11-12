import {
  Bug,
  FlaskConical,
  Package,
  ShieldCheck,
  Telescope,
  type LucideIcon,
} from "lucide-react";
import type { Mission, MissionTheme } from "@/domain/types";
import { useSvgId } from "@/lib/use-svg-id";

/** Presentation-only registry: maps content themes to visuals. */
export interface WorldVisual {
  icon: LucideIcon;
  /** Primary accent (hex) — exposed to CSS as --accent. */
  accent: string;
  /** Secondary tone for gradients — exposed as --accent-2. */
  accent2: string;
  /** Short environment label shown on the map. */
  biome: string;
}

const ACCENTS: Record<MissionTheme["accent"], [string, string]> = {
  cyan: ["#22d3ee", "#0e7490"],
  violet: ["#a78bfa", "#6d28d9"],
  coral: ["#fb7185", "#be123c"],
  emerald: ["#34d399", "#047857"],
  gold: ["#fbbf24", "#b45309"],
};

const VISUALS: Record<MissionTheme["visual"], { icon: LucideIcon; biome: string }> = {
  lab: { icon: FlaskConical, biome: "Wet lab · data bench" },
  factory: { icon: Package, biome: "Assembly floor" },
  crisis: { icon: Bug, biome: "Server room · red alert" },
  qc: { icon: ShieldCheck, biome: "Verification bay" },
  research: { icon: Telescope, biome: "Observatory" },
};

export function worldVisual(mission: Mission): WorldVisual {
  const [accent, accent2] = ACCENTS[mission.theme.accent];
  const v = VISUALS[mission.theme.visual];
  return { icon: v.icon, biome: v.biome, accent, accent2 };
}

export function accentStyle(mission: Mission): React.CSSProperties {
  const v = worldVisual(mission);
  return { "--accent": v.accent, "--accent-2": v.accent2 } as React.CSSProperties;
}

/**
 * A small, distinct emblem per world — drawn rather than iconographic,
 * so each world has its own silhouette on the map.
 */
export function WorldEmblem({
  mission,
  className,
}: {
  mission: Mission;
  className?: string;
}) {
  const v = worldVisual(mission);
  const id = useSvgId(`emb-${mission.id}`);
  const shapes: Record<MissionTheme["visual"], React.ReactNode> = {
    // Hexagonal flask chamber
    lab: <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" />,
    // Rounded square crate
    factory: <rect x="12" y="12" width="76" height="76" rx="18" />,
    // Jagged alert octagon
    crisis: <polygon points="34,6 66,6 94,34 94,66 66,94 34,94 6,66 6,34" />,
    // Shield
    qc: <path d="M50 5 L88 18 V48 C88 72 70 88 50 95 C30 88 12 72 12 48 V18 Z" />,
    // Star dial
    research: <circle cx="50" cy="50" r="44" />,
  };
  const Icon = v.icon;
  return (
    <span className={`relative inline-grid place-items-center ${className ?? ""}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={v.accent} stopOpacity="0.95" />
            <stop offset="100%" stopColor={v.accent2} stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <g fill={`url(#${id})`} stroke="rgb(255 255 255 / 0.28)" strokeWidth="1.5">
          {shapes[mission.theme.visual]}
        </g>
      </svg>
      <Icon className="relative h-[42%] w-[42%] text-ink-950" strokeWidth={2.2} aria-hidden="true" />
    </span>
  );
}
