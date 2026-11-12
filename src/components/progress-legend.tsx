import { BookOpen, CircleCheck, Flag, SquareTerminal } from "lucide-react";
import { cn } from "@/lib/cn";

const STATES = [
  { icon: SquareTerminal, color: "text-cyan", title: "Challenge validated", body: "Your R code passed every hidden check. Earns the challenge's XP once." },
  { icon: BookOpen, color: "text-violet", title: "Lesson completed", body: "Every knowledge-check answer correct. Bonus XP, once. Opening or watching alone never counts." },
  { icon: Flag, color: "text-gold", title: "World cleared", body: "All challenges and the boss validated. Unlocks the next world." },
  { icon: CircleCheck, color: "text-emerald", title: "World mastered", body: "Cleared, plus every lesson completed." },
];

/** One consistent explanation of the four progress states. */
export function ProgressLegend({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <ol className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4", className)} aria-label="How progress works">
      {STATES.map((s) => (
        <li key={s.title} className="panel p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <s.icon className={cn("h-4 w-4", s.color)} aria-hidden="true" /> {s.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}
