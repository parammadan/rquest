import { cn } from "@/lib/cn";
import { useSvgId } from "@/lib/use-svg-id";

/** RQuest mark: a route of three nodes inside a hex, ending in a goal node. */
export function LogoMark({ className }: { className?: string }) {
  const gid = useSvgId("rq-mark");
  return (
    <svg viewBox="0 0 40 40" className={cn("h-8 w-8", className)} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="55%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <path
        d="M20 2.5 35.2 11.25v17.5L20 37.5 4.8 28.75v-17.5Z"
        fill="#0c111d"
        stroke={`url(#${gid})`}
        strokeWidth="2"
      />
      <path
        d="M12 27c3-1 4-6 8-7s6 3 8-7"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="0.1 4.2"
      />
      <circle cx="12" cy="27" r="2.4" fill="#a78bfa" />
      <circle cx="20" cy="20" r="2.4" fill="#22d3ee" />
      <circle cx="28" cy="13" r="3.2" fill="#34d399" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-none">
        <span className="block font-display text-[1.05rem] font-semibold tracking-tight text-fg">
          R<span className="text-gradient">Quest</span>
        </span>
        {!compact && (
          <span className="mt-1 block whitespace-nowrap font-mono text-[0.56rem] uppercase tracking-[0.12em] text-fg-subtle">
            Research Programmer Academy
          </span>
        )}
      </span>
    </span>
  );
}
