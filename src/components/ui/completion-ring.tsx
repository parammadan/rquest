import { cn } from "@/lib/cn";
import { useSvgId } from "@/lib/use-svg-id";

export function CompletionRing({
  value,
  label,
  size = 120,
  ready = true,
  className,
  caption,
}: {
  /** 0..1 */
  value: number;
  label: string;
  size?: number;
  ready?: boolean;
  className?: string;
  caption?: string;
}) {
  const gid = useSvgId("ring");
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="img"
      aria-label={`${label}: ${ready ? `${pct}%` : "loading"}`}
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1d2740" strokeWidth="7" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <line
            key={i}
            x1="50"
            y1="2"
            x2="50"
            y2="5"
            stroke="rgb(148 163 184 / 0.25)"
            strokeWidth="1"
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
        {ready && pct > 0 && (
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * c} ${c}`}
            className="transition-[stroke-dasharray] duration-700"
          />
        )}
      </svg>
      <div className="relative text-center" aria-hidden="true">
        <span className="block font-display text-2xl font-semibold text-fg">{ready ? `${pct}%` : "—"}</span>
        {caption && <span className="block text-[0.65rem] uppercase tracking-wider text-fg-subtle">{caption}</span>}
      </div>
    </div>
  );
}
