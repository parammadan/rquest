"use client";

import { BookOpen, Check, SquareTerminal, Swords } from "lucide-react";
import type { MissionItem } from "@/domain/types";
import { isBoss } from "@/domain/progression";
import { cn } from "@/lib/cn";
import { formatMinutes } from "@/lib/format";

function itemIcon(item: MissionItem) {
  if (item.kind === "lesson") return BookOpen;
  return isBoss(item) ? Swords : SquareTerminal;
}

function kindLabel(item: MissionItem) {
  if (item.kind === "lesson") return "Video lesson";
  return isBoss(item) ? "Boss mission" : "Coding challenge";
}

export function LessonTimeline({
  items,
  completed,
  selectedId,
  onSelect,
}: {
  items: readonly MissionItem[];
  completed: ReadonlySet<string>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ol className="relative space-y-2" aria-label="Lessons and challenges">
      <span aria-hidden="true" className="absolute bottom-6 left-[1.6rem] top-6 w-px bg-line-strong" />
      {items.map((item, i) => {
        const Icon = itemIcon(item);
        const done = completed.has(item.id);
        const selected = item.id === selectedId;
        const boss = isBoss(item);
        const phase = item.availability.status === "planned" ? item.availability.phase : null;
        return (
          <li key={item.id} className="relative">
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={selected}
              aria-label={`${i + 1}. ${kindLabel(item)}: ${item.title}. ${item.xp} XP. ${done ? "Completed" : phase ? `Coming in phase ${phase}` : "Available now"}. Show preview.`}
              className={cn(
                "group flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition",
                selected
                  ? "border-[color-mix(in_oklab,var(--accent)_55%,transparent)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]"
                  : "border-transparent hover:border-line hover:bg-white/[0.02]",
              )}
            >
              <span
                className={cn(
                  "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl border",
                  done
                    ? "border-emerald/40 bg-emerald/15 text-emerald"
                    : boss
                      ? "border-[color-mix(in_oklab,var(--accent)_50%,transparent)] bg-ink-800 text-[var(--accent)]"
                      : "border-line-strong bg-ink-800 text-fg-muted",
                )}
                aria-hidden="true"
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[0.62rem] uppercase tracking-wider text-fg-subtle">
                  {String(i + 1).padStart(2, "0")} · {kindLabel(item)}
                </span>
                <span className={cn("block truncate font-medium", boss ? "font-display" : "")}>{item.title}</span>
                <span className="block text-xs text-fg-subtle">
                  ~{formatMinutes(item.estimatedMinutes)} · {item.xp} XP
                </span>
              </span>
              <span className="hidden shrink-0 sm:block">
                {done ? (
                  <span className="text-xs font-medium text-emerald">Completed</span>
                ) : phase ? (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider",
                      phase === 2 ? "border-cyan/30 text-cyan" : "border-violet/30 text-violet",
                    )}
                  >
                    Phase {phase}
                  </span>
                ) : (
                  <span className="rounded-full border border-emerald/30 px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider text-emerald">
                    Live
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
