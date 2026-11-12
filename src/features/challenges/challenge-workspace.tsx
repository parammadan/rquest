"use client";

import {
  ArrowLeft,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Cpu,
  LoaderCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Swords,
  TriangleAlert,
} from "lucide-react";
import { motion } from "motion/react";
import { PackageAssembly } from "@/features/lessons/diagrams";
import Link from "next/link";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { ComingSoonPanel } from "@/components/coming-soon-panel";
import { Button } from "@/components/ui/button";
import { DifficultyMeter, Skeleton } from "@/components/ui/primitives";
import { catalog } from "@/content/catalog";
import { validatorForChallenge } from "@/content/validators";
import type { CheckOutcome, EvaluationResult } from "@/domain/evaluation";
import type { Challenge } from "@/domain/types";
import { useProgress, useRecordValidatedCompletion } from "@/features/progress/progress-provider";
import { LockedMissionScreen } from "@/features/missions/mission-detail";
import { RCode } from "@/features/missions/r-code";
import { evaluateChallenge, runChallengeCode } from "@/features/runtime/evaluate-challenge";
import type { ConsoleLine } from "@/features/runtime/r-session";
import { rSession, WEBR_VERSION } from "@/features/runtime/r-session";
import { useRSession } from "@/features/runtime/use-r-session";
import { accentStyle } from "@/features/worlds/world-visuals";
import { cn } from "@/lib/cn";
import { formatMinutes } from "@/lib/format";
import { REditor } from "./r-editor";

const draftKey = (id: string) => `rquest:draft:v1:${id}`;

function readDraft(id: string): string | null {
  try {
    return localStorage.getItem(draftKey(id));
  } catch {
    return null;
  }
}
function writeDraft(id: string, code: string | null) {
  try {
    if (code === null) localStorage.removeItem(draftKey(id));
    else localStorage.setItem(draftKey(id), code);
  } catch {
    /* storage unavailable: drafts are a convenience only */
  }
}

type Outcome =
  | { kind: "awarded"; xp: number; unlockedBefore: string[] }
  | { kind: "already" }
  | { kind: "not-recorded"; reason: string };

/* ------------------------------------------------------------------ */

export function ChallengeGate({ missionId, challengeId }: { missionId: string; challengeId: string }) {
  const { ready, progress } = useProgress();
  const mission = catalog.getMission(missionId)!;
  const challenge = catalog.getItem(challengeId) as Challenge;

  if (!ready) {
    return (
      <div aria-busy="true" aria-label="Loading challenge">
        <Skeleton className="h-10 w-64" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
          <Skeleton className="h-96 w-full rounded-[1.25rem]" />
          <Skeleton className="h-96 w-full rounded-[1.25rem]" />
        </div>
      </div>
    );
  }
  if (progress.missions[mission.id].status === "locked") {
    return <LockedMissionScreen mission={mission} progress={progress} />;
  }
  if (challenge.availability.status !== "available") {
    return (
      <div style={accentStyle(mission)}>
        <BackToMission missionId={mission.id} title={mission.title} />
        <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">{challenge.title}</h1>
        <ComingSoonPanel phase={challenge.availability.phase} icon={ShieldCheck} title="Validator in development">
          <p>{challenge.summary}</p>
          <p className="mt-3">
            In-browser R is live, but this challenge opens only once its validator is written. Until then it cannot be
            run or submitted, and it awards no XP.
          </p>
        </ComingSoonPanel>
      </div>
    );
  }
  return <ChallengeWorkspace challenge={challenge} completed={progress.completedItemIds.has(challenge.id)} />;
}

function BackToMission({ missionId, title }: { missionId: string; title: string }) {
  return (
    <Link
      href={`/academy/missions/${missionId}`}
      className="mb-5 inline-flex items-center gap-1.5 text-sm text-fg-muted transition hover:text-fg"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {title}
    </Link>
  );
}

/* ------------------------------------------------------------------ */

function ChallengeWorkspace({ challenge, completed }: { challenge: Challenge; completed: boolean }) {
  const mission = catalog.getMission(challenge.missionId)!;
  const def = validatorForChallenge(challenge.id)!;
  const record = useRecordValidatedCompletion();
  const { progress } = useProgress();

  const [code, setCode] = useState(challenge.starterCode);
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState<"run" | "submit" | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  });

  // Restore a saved draft after hydration (drafts are per challenge, per browser).
  useEffect(() => {
    const d = readDraft(challenge.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from browser storage
    if (d !== null) setCode(d);
  }, [challenge.id]);

  const onChange = (next: string) => {
    setCode(next);
    writeDraft(challenge.id, next === challenge.starterCode ? null : next);
  };

  const run = async () => {
    if (busy) return;
    setBusy("run");
    setLines([{ kind: "system", text: "> Running…" }]);
    const res = await runChallengeCode(challenge, code);
    setLines(res.lines.length ? res.lines : [{ kind: "system", text: "(no output)" }]);
    setBusy(null);
  };

  const submit = async () => {
    if (busy) return;
    setBusy("submit");
    setOutcome(null);
    setEvaluation(null);
    const before = progressRef.current;
    const { result, receipt } = await evaluateChallenge(challenge, code);
    setEvaluation(result);
    if (receipt) {
      const r = record(challenge.id, receipt);
      if (r.ok) {
        const unlockedBefore = before.achievements.filter((a) => a.unlocked).map((a) => a.achievement.id);
        setOutcome({ kind: "awarded", xp: challenge.xp, unlockedBefore });
      } else if (r.reason === "duplicate") {
        setOutcome({ kind: "already" });
      } else {
        setOutcome({ kind: "not-recorded", reason: r.reason });
      }
    }
    setBusy(null);
    requestAnimationFrame(() => resultsRef.current?.focus());
  };

  const reset = () => {
    setCode(challenge.starterCode);
    writeDraft(challenge.id, null);
  };

  // Achievements unlocked by this submission (progress re-derives from the new event).
  const newAchievements =
    outcome?.kind === "awarded"
      ? progress.achievements
          .filter((a) => a.unlocked && !outcome.unlockedBefore.includes(a.achievement.id))
          .map((a) => a.achievement.title)
      : [];

  const checkStates: Record<string, CheckOutcome | undefined> = useMemo(() => {
    if (!evaluation || !("checks" in evaluation)) return {};
    return Object.fromEntries(evaluation.checks.map((c) => [c.id, c]));
  }, [evaluation]);

  return (
    <article style={accentStyle(mission)} aria-labelledby="challenge-title">
      <BackToMission missionId={mission.id} title={`${mission.worldLabel}: ${mission.title}`} />

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-[var(--accent)]!">
            {challenge.type === "boss" ? "Boss mission" : "Coding challenge"} · {mission.worldLabel}
          </p>
          <h1 id="challenge-title" className="mt-1 font-display text-3xl font-semibold tracking-tight">
            {challenge.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-muted">
            <DifficultyMeter level={challenge.difficulty} />
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-fg-subtle" aria-hidden="true" />~{formatMinutes(challenge.estimatedMinutes)}
            </span>
            <span className="font-medium text-[var(--accent)]">{challenge.xp} XP</span>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-sm sm:self-auto",
            completed ? "border-emerald/35 bg-emerald/10 text-emerald" : "border-line-strong text-fg-muted",
          )}
        >
          {completed ? <CircleCheck className="h-4 w-4" aria-hidden="true" /> : <CircleDashed className="h-4 w-4" aria-hidden="true" />}
          {completed ? "Validated" : "Not yet validated"}
        </span>
      </header>

      {challenge.bossBriefing && <BossBriefing challenge={challenge} completed={completed} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)]">
        {/* Brief + checks */}
        <div className="space-y-6">
          <section aria-labelledby="brief" className="panel p-5">
            <h2 id="brief" className="eyebrow mb-3">
              Brief
            </h2>
            <div className="space-y-2.5 text-sm leading-relaxed text-fg-muted">
              {challenge.instructions.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>

          <section aria-labelledby="checks-h" className="panel p-5">
            <h2 id="checks-h" className="eyebrow mb-1">
              What the validator checks
            </h2>
            <p className="mb-4 text-xs text-fg-subtle">
              All {def.checks.length} must pass. XP is awarded once, the first time they do.
            </p>
            <ol className="space-y-2.5">
              {def.checks.map((c) => {
                const st = checkStates[c.id];
                return (
                  <li key={c.id} className="flex gap-3 text-sm">
                    {st ? (
                      st.passed ? (
                        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald" aria-label="Passed" />
                      ) : (
                        <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-coral" aria-label="Failed" />
                      )
                    ) : (
                      <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-label="Not run" />
                    )}
                    <span>
                      <span className={st && !st.passed ? "text-fg" : "text-fg-muted"}>{c.description}</span>
                      {st && !st.passed && <span className="mt-1 block text-xs text-coral/90">Hint: {c.hint}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        {/* Editor + console */}
        <div className="space-y-4">
          <section aria-label="Code editor" className="panel overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
              <SessionPill />
              <span className="ml-auto flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={reset} disabled={!!busy} aria-label="Reset code to the starter version">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
                </Button>
                <Button variant="secondary" size="sm" onClick={run} disabled={!!busy} aria-keyshortcuts="Control+Enter Meta+Enter">
                  {busy === "run" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                  Run
                </Button>
                <Button size="sm" onClick={submit} disabled={!!busy} aria-keyshortcuts="Control+Shift+Enter Meta+Shift+Enter">
                  {busy === "submit" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                  Submit for validation
                </Button>
              </span>
            </div>
            <div className="h-[22rem] sm:h-[26rem]">
              <REditor
                value={code}
                onChange={onChange}
                onRun={run}
                onSubmit={submit}
                label={`R code for ${challenge.title}`}
                describedBy="editor-help"
              />
            </div>
            <p id="editor-help" className="border-t border-line px-4 py-2 font-mono text-[0.68rem] text-fg-subtle">
              ⌘/Ctrl+Enter run · ⌘/Ctrl+Shift+Enter submit · Esc then Tab leaves the editor · drafts save in this browser
            </p>
          </section>

          <ResultBanner
            ref={resultsRef}
            evaluation={evaluation}
            outcome={outcome}
            newAchievements={newAchievements}
            busy={busy === "submit"}
          />

          <section aria-labelledby="console-h" className="panel overflow-hidden">
            <h2 id="console-h" className="eyebrow border-b border-line px-4 py-2.5">
              Console
            </h2>
            <div role="log" aria-live="polite" className="max-h-72 min-h-24 overflow-auto bg-[#060910] p-4 font-mono text-[0.8rem] leading-6">
              {lines.length === 0 ? (
                <p className="text-fg-subtle">Output from Run appears here. Run doesn’t submit anything.</p>
              ) : (
                lines.map((l, i) => (
                  <pre
                    key={i}
                    className={cn(
                      "whitespace-pre-wrap break-words",
                      l.kind === "error" && "text-coral",
                      l.kind === "warning" && "text-gold",
                      (l.kind === "message" || l.kind === "stderr") && "text-fg-muted",
                      l.kind === "system" && "text-fg-subtle",
                    )}
                  >
                    {l.kind === "error" ? `Error: ${l.text}` : l.kind === "warning" ? `Warning: ${l.text}` : l.text}
                  </pre>
                ))
              )}
            </div>
          </section>

          <details className="panel p-4 text-sm">
            <summary className="cursor-pointer text-fg-muted">Original starter code</summary>
            <div className="mt-3">
              <RCode code={challenge.starterCode} filename="starter.R" />
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */

/** Animated boss briefing: the stakes, the release gates, and the world's assembly so far. */
function BossBriefing({ challenge, completed }: { challenge: Challenge; completed: boolean }) {
  const mission = catalog.getMission(challenge.missionId)!;
  const { progress } = useProgress();
  const [open, setOpen] = useState(!completed);
  const b = challenge.bossBriefing!;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mb-6 inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
        <Swords className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" /> Show boss briefing
      </button>
    );
  }
  return (
    <motion.section
      aria-labelledby="boss-h"
      className="panel-raised relative mb-6 overflow-hidden p-6 sm:p-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Swords aria-hidden="true" className="absolute -right-6 -top-6 h-40 w-40 text-white/[0.04]" />
      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <p className="eyebrow text-[var(--accent)]!">Boss briefing</p>
          <h2 id="boss-h" className="mt-1 font-display text-2xl font-semibold">{b.headline}</h2>
          <p className="mt-2 text-fg-muted">{b.story}</p>
          <ol className="mt-5 space-y-2">
            {b.gates.map((g, i) => (
              <motion.li
                key={g}
                className="flex items-center gap-2.5 text-sm"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded-full border font-mono text-[0.6rem]",
                    completed ? "border-emerald bg-emerald text-ink-950" : "border-line-strong text-fg-subtle",
                  )}
                  aria-hidden="true"
                >
                  {completed ? "✓" : i + 1}
                </span>
                {g}
              </motion.li>
            ))}
          </ol>
          <Button size="sm" variant="secondary" className="mt-6" onClick={() => setOpen(false)}>
            {completed ? "Hide briefing" : "Start the build"}
          </Button>
        </div>
        {mission.assembly && (
          <PackageAssembly
            title={mission.assembly.title}
            caption={mission.assembly.caption}
            parts={mission.assembly.parts}
            completed={progress.completedItemIds}
            compact
          />
        )}
      </div>
    </motion.section>
  );
}

function SessionPill() {
  const s = useRSession();
  const label =
    s.status === "idle"
      ? "R not started"
      : s.status === "starting"
        ? "Starting R…"
        : s.status === "installing"
          ? (s.detail ?? "Installing packages…")
          : s.status === "running"
            ? (s.detail ?? "Running…")
            : s.status === "failed"
              ? "R failed to start"
              : `R ${s.rVersion ?? ""} ready`;
  const spinning = s.status === "starting" || s.status === "installing" || s.status === "running";
  return (
    <span className="flex min-w-0 items-center gap-2" role="status">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
          s.status === "ready" ? "border-emerald/30 text-emerald" : s.status === "failed" ? "border-coral/40 text-coral" : "border-line-strong text-fg-muted",
        )}
      >
        {spinning ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Cpu className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </span>
      {(s.status === "idle" || s.status === "failed") && (
        <button
          type="button"
          onClick={() => void rSession.start().catch(() => undefined)}
          className="text-xs text-cyan hover:underline"
        >
          {s.status === "failed" ? "Retry" : "Start R"}
        </button>
      )}
      {s.status === "starting" && (
        <span className="hidden text-xs text-fg-subtle sm:inline">first load downloads webR {WEBR_VERSION} (~30 MB)</span>
      )}
      {s.status === "idle" && s.detail && <span className="text-xs text-gold">{s.detail}</span>}
    </span>
  );
}


const ResultBanner = forwardRef<
  HTMLDivElement,
  { evaluation: EvaluationResult | null; outcome: Outcome | null; newAchievements: string[]; busy: boolean }
>(function ResultBanner({ evaluation, outcome, newAchievements, busy }, ref) {
  if (busy) {
    return (
      <div ref={ref} tabIndex={-1} role="status" className="panel flex items-center gap-3 p-4 text-sm text-fg-muted">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Running your code and the hidden checks…
      </div>
    );
  }
  if (!evaluation) return <div ref={ref} tabIndex={-1} />;

  let tone = "border-coral/35 bg-coral/[0.07]";
  let icon = <CircleX className="h-5 w-5 text-coral" aria-hidden="true" />;
  let title = "";
  let body: React.ReactNode = null;

  if (evaluation.status === "passed") {
    tone = "border-emerald/35 bg-emerald/[0.08]";
    icon = <Sparkles className="h-5 w-5 text-emerald" aria-hidden="true" />;
    title = "All checks passed";
    body =
      outcome?.kind === "awarded"
        ? `Validated. +${outcome.xp} XP recorded in your progress.${newAchievements.length ? ` Achievement unlocked: ${newAchievements.join(", ")}.` : ""}`
        : outcome?.kind === "already"
          ? "Already validated earlier — no additional XP is awarded for repeat passes."
          : outcome?.kind === "not-recorded"
            ? `The result could not be recorded (${outcome.reason}).`
            : null;
  } else if (evaluation.status === "failed") {
    const passed = evaluation.checks.filter((c) => c.passed).length;
    title = `${passed} of ${evaluation.checks.length} checks passed`;
    body = "No XP awarded. Review the hints next to the failing checks, then submit again.";
  } else if (evaluation.status === "error") {
    title = "Your code raised an error";
    body = evaluation.message;
  } else {
    tone = "border-gold/35 bg-gold/[0.07]";
    icon = <TriangleAlert className="h-5 w-5 text-gold" aria-hidden="true" />;
    title = evaluation.status === "timeout" ? "Time limit reached" : "The R session had a problem";
    body = evaluation.message;
  }

  return (
    <div ref={ref} tabIndex={-1} role="status" className={cn("flex gap-3 rounded-[var(--radius-card)] border p-4 outline-none", tone)}>
      {icon}
      <div className="text-sm">
        <p className="font-medium text-fg">{title}</p>
        {body && <p className="mt-0.5 text-fg-muted">{body}</p>}
      </div>
    </div>
  );
});
