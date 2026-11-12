"use client";

import { ArrowRight, Check, File, Folder, Lock, Package } from "lucide-react";
import { motion } from "motion/react";
import type { AssemblyPart, FileTreeEntry, LessonBlock } from "@/domain/types";
import { catalog } from "@/content/catalog";
import { cn } from "@/lib/cn";

/** A package/file tree diagram; entries appear in order. */
export function FileTreeBlock({ title, entries, caption }: { title: string; entries: FileTreeEntry[]; caption?: string }) {
  return (
    <figure className="panel overflow-hidden" aria-label={`File structure: ${title}`}>
      <div className="border-b border-line px-4 py-2 font-mono text-xs text-fg-subtle">{title}</div>
      <ul className="p-4 font-mono text-[0.82rem] leading-7">
        {entries.map((e, i) => (
          <motion.li
            key={`${e.name}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className={cn("flex items-baseline gap-2", e.highlight && "text-[var(--accent)]")}
            style={{ paddingLeft: `${e.depth * 1.25}rem` }}
          >
            {e.dir ? (
              <Folder className="h-3.5 w-3.5 shrink-0 self-center text-[var(--accent)]" aria-hidden="true" />
            ) : (
              <File className="h-3.5 w-3.5 shrink-0 self-center text-fg-subtle" aria-hidden="true" />
            )}
            <span className={e.highlight ? "font-semibold" : "text-fg"}>{e.name}</span>
            {e.note && <span className="font-sans text-xs text-fg-subtle">{e.note}</span>}
          </motion.li>
        ))}
      </ul>
      {caption && <figcaption className="border-t border-line px-4 py-2 text-xs text-fg-subtle">{caption}</figcaption>}
    </figure>
  );
}

/** Columns connected by arrows: e.g. DESCRIPTION → NAMESPACE → R code. */
export function DependencyMapBlock({ block }: { block: Extract<LessonBlock, { kind: "dependency-map" }> }) {
  return (
    <figure className="panel p-4" aria-label={block.title}>
      <p className="mb-3 font-display text-sm font-semibold">{block.title}</p>
      <ol className="flex flex-col gap-2 md:flex-row md:items-stretch">
        {block.columns.map((c, i) => (
          <li key={c.title} className="flex flex-col gap-2 md:flex-1 md:flex-row md:items-center">
            <motion.div
              className="flex-1 rounded-xl border border-line bg-ink-900 p-3"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <p className="font-mono text-[0.7rem] uppercase tracking-wider text-[var(--accent)]">{c.title}</p>
              <pre className="mt-1.5 whitespace-pre-wrap font-mono text-[0.75rem] leading-5 text-fg">{c.lines.join("\n")}</pre>
              <p className="mt-2 text-xs text-fg-muted">{c.note}</p>
            </motion.div>
            {i < block.columns.length - 1 && (
              <ArrowRight className="mx-auto h-4 w-4 shrink-0 rotate-90 text-fg-subtle md:rotate-0" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
      {block.caption && <figcaption className="mt-3 text-xs text-fg-subtle">{block.caption}</figcaption>}
    </figure>
  );
}

/** The world's workshop: parts light up as the items that build them are validated. */
export function PackageAssembly({
  title,
  caption,
  parts,
  completed,
  compact = false,
}: {
  title: string;
  caption: string;
  parts: AssemblyPart[];
  completed: ReadonlySet<string>;
  compact?: boolean;
}) {
  const isBuilt = (p: AssemblyPart) => p.assembledBy.length === 0 || p.assembledBy.some((id) => completed.has(id));
  const built = parts.filter(isBuilt).length;
  return (
    <section aria-labelledby="assembly-h" className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 id="assembly-h" className="flex items-center gap-2 font-display font-semibold">
          <Package className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" /> {title}
        </h2>
        <span className="font-mono text-xs text-fg-subtle">
          {built}/{parts.length} assembled
        </span>
      </div>
      <ul className={cn("p-4 font-mono text-[0.82rem]", compact ? "leading-7" : "leading-8")}>
        {parts.map((p) => {
          const ok = isBuilt(p);
          const by = p.assembledBy.map((id) => catalog.getItem(id)?.title).filter(Boolean);
          return (
            <li key={p.id} className="flex items-center gap-2" style={{ paddingLeft: `${p.depth * 1.25}rem` }}>
              <motion.span
                initial={false}
                animate={{ scale: ok ? 1 : 0.9, opacity: ok ? 1 : 0.6 }}
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-md border",
                  ok ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_25%,transparent)] text-fg" : "border-line-strong text-fg-subtle",
                )}
                aria-hidden="true"
              >
                {ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <Lock className="h-2.5 w-2.5" />}
              </motion.span>
              <span className={ok ? "text-fg" : "text-fg-subtle"}>{p.label}</span>
              {!compact && <span className="hidden font-sans text-xs text-fg-subtle sm:inline">{p.note}</span>}
              <span className="sr-only">
                {ok ? "assembled" : `not yet assembled. Built by: ${by.join(", ")}`}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-5 py-2 text-xs text-fg-subtle">{caption}</p>
    </section>
  );
}
