import type { LucideIcon } from "lucide-react";
import { PhaseChip } from "@/components/ui/primitives";
import type { DeliveryPhase } from "@/domain/types";
import { cn } from "@/lib/cn";

/** Honest placeholder for features planned in later phases. */
export function ComingSoonPanel({
  phase,
  icon: Icon,
  title,
  children,
  className,
  frame,
}: {
  phase: DeliveryPhase;
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Optional visual mock (video frame, editor) rendered above the copy. */
  frame?: React.ReactNode;
}) {
  return (
    <section className={cn("panel relative overflow-hidden", className)} aria-label={`${title} (coming in phase ${phase})`}>
      {frame}
      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05] ring-1 ring-inset ring-line">
            <Icon className="h-[18px] w-[18px] text-fg-muted" aria-hidden="true" />
          </span>
          <h3 className="font-display text-base font-semibold">{title}</h3>
          <PhaseChip phase={phase} className="ml-auto" />
        </div>
        <div className="text-sm leading-relaxed text-fg-muted">{children}</div>
      </div>
    </section>
  );
}
