"use client";

import { ChevronLeft, ChevronRight, LoaderCircle, Play, TriangleAlert, Lightbulb } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CodeWalkthrough, LessonBlock } from "@/domain/types";
import { highlightLine } from "@/features/missions/r-code";
import { rSession } from "@/features/runtime/r-session";
import type { ConsoleLine } from "@/features/runtime/r-session";
import { cn } from "@/lib/cn";

function CodeLines({ code, highlight = [], label }: { code: string; highlight?: number[]; label: string }) {
  return (
    <pre tabIndex={0} aria-label={label} className="overflow-x-auto bg-[#060910] py-3 font-mono text-[0.8rem] leading-6">
      <code>
        {code.split("\n").map((line, i) => (
          <span
            key={i}
            className={cn(
              "block px-4",
              highlight.includes(i + 1) && "bg-cyan/10 shadow-[inset_3px_0_0_var(--color-cyan)]",
            )}
          >
            <span aria-hidden="true" className="mr-4 inline-block w-5 select-none text-right text-ink-600">
              {i + 1}
            </span>
            {highlightLine(line)}
          </span>
        ))}
      </code>
    </pre>
  );
}

function Output({ text, live }: { text: string; live?: boolean }) {
  return (
    <div className="border-t border-line bg-[#060910] px-4 py-3">
      <p className="mb-1 font-mono text-[0.6rem] uppercase tracking-wider text-fg-subtle">{live ? "Your run" : "Output"}</p>
      <pre className="whitespace-pre-wrap font-mono text-[0.78rem] leading-6 text-fg-muted">{text}</pre>
    </div>
  );
}

/** A code example that can actually be run in the browser's R session. */
export function RunnableCode({ code, output, caption }: { code: string; output?: string; caption?: string }) {
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<ConsoleLine[] | null>(null);
  const run = async () => {
    setBusy(true);
    const res = await rSession.run(code, { setup: "", packages: [], timeoutMs: 10_000 });
    setLines(res.lines);
    setBusy(false);
  };
  return (
    <figure className="overflow-hidden rounded-xl border border-line">
      <div className="flex items-center justify-between border-b border-line bg-ink-900 px-3 py-1.5">
        <span className="font-mono text-xs text-fg-subtle">example.R</span>
        <Button size="sm" variant="ghost" onClick={run} disabled={busy} className="h-8">
          {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
          {busy ? "Running in R…" : "Run in R"}
        </Button>
      </div>
      <CodeLines code={code} label="Example R code" />
      {lines ? (
        <div aria-live="polite">
          <Output live text={lines.map((l) => (l.kind === "error" ? `Error: ${l.text}` : l.kind === "warning" ? `Warning: ${l.text}` : l.text)).join("\n") || "(no output)"} />
        </div>
      ) : (
        output && <Output text={output} />
      )}
      {caption && <figcaption className="border-t border-line px-4 py-2 text-xs text-fg-subtle">{caption}</figcaption>}
    </figure>
  );
}

export function LessonBlocks({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        if (b.kind === "text") return <p key={i} className="text-[0.95rem] leading-relaxed text-fg-muted">{b.body}</p>;
        if (b.kind === "code") return b.runnable ? (
          <RunnableCode key={i} code={b.code} output={b.output} caption={b.caption} />
        ) : (
          <figure key={i} className="overflow-hidden rounded-xl border border-line">
            <CodeLines code={b.code} label="Example R code" />
            {b.output && <Output text={b.output} />}
          </figure>
        );
        const warn = b.tone === "warning";
        return (
          <aside
            key={i}
            className={cn(
              "flex gap-3 rounded-xl border p-4 text-sm leading-relaxed",
              warn ? "border-gold/30 bg-gold/[0.06]" : "border-cyan/25 bg-cyan/[0.05]",
            )}
          >
            {warn ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" /> : <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden="true" />}
            <div>
              <p className={cn("font-medium", warn ? "text-gold" : "text-cyan")}>{b.title}</p>
              <p className="mt-0.5 text-fg-muted">{b.body}</p>
            </div>
          </aside>
        );
      })}
    </div>
  );
}

/** Step-through code demonstration with highlighted lines and output per step. */
export function Walkthrough({ walkthrough }: { walkthrough: CodeWalkthrough }) {
  const [i, setI] = useState(0);
  const step = walkthrough.steps[i];
  const n = walkthrough.steps.length;
  return (
    <section aria-labelledby="walkthrough-h" className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h3 id="walkthrough-h" className="font-display font-semibold">{walkthrough.title}</h3>
        <span className="font-mono text-xs text-fg-subtle" aria-live="polite">
          Step {i + 1} of {n}
        </span>
      </div>
      <CodeLines code={walkthrough.code} highlight={step.highlight} label={walkthrough.title} />
      <div className="border-t border-line p-5">
        <p className="font-medium">{step.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-fg-muted">{step.note}</p>
        {step.output && (
          <pre className="mt-3 overflow-x-auto rounded-lg bg-[#060910] p-3 font-mono text-[0.78rem] leading-6 text-emerald">{step.output}</pre>
        )}
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setI((x) => Math.min(n - 1, x + 1))} disabled={i === n - 1}>
            Next step <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="ml-auto flex gap-1.5" aria-hidden="true">
            {walkthrough.steps.map((_, k) => (
              <span key={k} className={cn("h-1.5 w-6 rounded-full", k <= i ? "bg-cyan" : "bg-ink-600")} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
