import { Bug, Crown, FlaskConical, Footprints, Lock, Package, ShieldCheck, Swords, Telescope, type LucideIcon } from "lucide-react";
import type { Achievement } from "@/domain/types";
import { cn } from "@/lib/cn";
import { useSvgId } from "@/lib/use-svg-id";

const EMBLEMS: Record<Achievement["emblem"], LucideIcon> = {
  footprints: Footprints,
  flask: FlaskConical,
  package: Package,
  bug: Bug,
  shield: ShieldCheck,
  telescope: Telescope,
  swords: Swords,
  crown: Crown,
};

const TIERS: Record<Achievement["tier"], { from: string; to: string; label: string }> = {
  bronze: { from: "#f0a46c", to: "#9a5a2c", label: "Bronze" },
  silver: { from: "#e2e8f0", to: "#7b8798", label: "Silver" },
  gold: { from: "#fde68a", to: "#d97706", label: "Gold" },
};

export const tierLabel = (t: Achievement["tier"]) => TIERS[t].label;

/** Medal-style badge. Locked badges render as an engraved silhouette. */
export function AchievementBadge({
  achievement,
  unlocked,
  size = "md",
  className,
}: {
  achievement: Achievement;
  unlocked: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = EMBLEMS[achievement.emblem];
  const tier = TIERS[achievement.tier];
  const dims = { sm: "h-12 w-12", md: "h-20 w-20", lg: "h-28 w-28" }[size];
  const gid = useSvgId(`tier-${achievement.id}`);
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", dims, className)} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={tier.from} />
            <stop offset="100%" stopColor={tier.to} />
          </linearGradient>
        </defs>
        {/* Scalloped medal edge */}
        <path
          d="M50 3l8.3 6.4 10.4-1.2 4.3 9.6 9.6 4.3-1.2 10.4L97 50l-6.4 8.3 1.2 10.4-9.6 4.3-4.3 9.6-10.4-1.2L50 97l-8.3-6.4-10.4 1.2-4.3-9.6-9.6-4.3 1.2-10.4L3 50l6.4-8.3-1.2-10.4 9.6-4.3 4.3-9.6 10.4 1.2Z"
          fill={unlocked ? `url(#${gid})` : "#151d30"}
          stroke={unlocked ? "rgb(255 255 255 / 0.35)" : "rgb(148 163 184 / 0.25)"}
          strokeWidth="1.2"
          strokeDasharray={unlocked ? undefined : "3 3"}
        />
        <circle cx="50" cy="50" r="31" fill={unlocked ? "#0c111d" : "#0c111d"} opacity={unlocked ? 0.9 : 1} />
        <circle
          cx="50"
          cy="50"
          r="31"
          fill="none"
          stroke={unlocked ? `url(#${gid})` : "rgb(148 163 184 / 0.18)"}
          strokeWidth="2"
        />
      </svg>
      <Icon
        className={cn("relative h-[34%] w-[34%]", unlocked ? "" : "text-ink-600")}
        style={unlocked ? { color: tier.from } : undefined}
        strokeWidth={2}
      />
      {!unlocked && (
        <span className="absolute bottom-0 right-0 grid h-[30%] w-[30%] place-items-center rounded-full border-2 border-ink-950 bg-ink-700 text-fg-muted">
          <Lock className="h-1/2 w-1/2" />
        </span>
      )}
    </span>
  );
}
