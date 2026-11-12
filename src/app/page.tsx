import { ArrowRight, BadgeCheck, BookOpen, Clock, Database, Gauge, SquareTerminal, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { DifficultyMeter } from "@/components/ui/primitives";
import { catalog } from "@/content/catalog";
import { Logo } from "@/features/brand/logo";
import { JourneyVisual } from "@/features/landing/journey-visual";
import { summarizeMission } from "@/features/missions/mission-summary";
import { accentStyle, worldVisual, WorldEmblem } from "@/features/worlds/world-visuals";

const STEPS = [
  {
    icon: BookOpen,
    title: "Learn",
    body: "Narrated video lessons with written walkthroughs, live R examples, and knowledge checks.",
  },
  {
    icon: SquareTerminal,
    title: "Practice",
    body: "Write and run real R directly in your browser. No installs, no setup, no shared server.",
  },
  {
    icon: BadgeCheck,
    title: "Prove",
    body: "Every challenge is checked automatically against hidden tests, including inputs you haven’t seen.",
  },
  {
    icon: Trophy,
    title: "Progress",
    body: "XP, levels, and achievements earned only from validated work. Clear the boss mission to unlock the next world.",
  },
];

const PRINCIPLES = [
  { icon: Gauge, title: "Earned, never simulated", body: "No streak theatre, no participation XP. Progress is an audit trail of validated completions." },
  { icon: Swords, title: "Real-world missions", body: "Messy exports, failing checks, broken environments, QC discrepancies — the situations research programmers actually face." },
  { icon: Database, title: "Synthetic data only", body: "Every dataset in RQuest is synthetic. No real clinical or patient data, ever." },
];

const ITEMS = catalog.missions.flatMap((m) => m.items);
const CHALLENGES = ITEMS.filter((i) => i.kind === "challenge" && i.availability.status === "available").length;
const LIVE_LESSONS = ITEMS.filter((i) => i.kind === "lesson" && i.availability.status === "available").length;
const PLANNED_LESSONS = ITEMS.filter((i) => i.kind === "lesson" && i.availability.status === "planned").length;
const LESSON_WORLDS = new Intl.ListFormat("en", { type: "conjunction" }).format(
  catalog.missions
    .filter((m) => m.items.some((i) => i.kind === "lesson" && i.availability.status === "available"))
    .map((m) => m.worldLabel),
);

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 left-1/2 h-[42rem] w-[60rem] -translate-x-1/2 rounded-full bg-violet/[0.10] blur-3xl" />
        <div className="absolute right-0 top-[30rem] h-[30rem] w-[30rem] rounded-full bg-cyan/[0.06] blur-3xl" />
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label="RQuest home">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          <a href="#worlds" className="hidden rounded-lg px-3 py-2 text-sm text-fg-muted hover:text-fg sm:block">
            Worlds
          </a>
          <a href="#how" className="hidden rounded-lg px-3 py-2 text-sm text-fg-muted hover:text-fg sm:block">
            How it works
          </a>
          <ButtonLink href="/academy" size="sm" variant="secondary">
            Enter academy
          </ButtonLink>
        </nav>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/[0.07] px-3 py-1 text-xs text-cyan">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan" aria-hidden="true" />
              {CHALLENGES} challenges run real R in your browser. Nothing to install.
            </p>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Become the <span className="text-gradient">research programmer</span> every study depends on.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-muted">
              RQuest is a game-based academy for R programmers, research engineers, and statisticians. Travel five worlds
              — from R fundamentals to fully reproducible statistical programming — and level up only by doing the work.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/academy" size="lg">
                Start Learning
                <ArrowRight className="h-5 w-5 transition group-hover/btn:translate-x-0.5" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="#worlds" size="lg" variant="secondary">
                Explore the worlds
              </ButtonLink>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-2 gap-6 border-t border-line pt-6 sm:grid-cols-4">
              {[
                ["5", "worlds"],
                [String(CHALLENGES), "R challenges, all playable"],
                [String(LIVE_LESSONS), `video lessons (${PLANNED_LESSONS} more in production)`],
                [String(catalog.achievements.length), "achievements"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd>
                    <span className="block font-display text-2xl font-semibold">{v}</span>
                    <span className="text-xs text-fg-subtle">{l}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <JourneyVisual />
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-h" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 sm:px-6">
          <p className="eyebrow mb-2">The loop</p>
          <h2 id="how-h" className="font-display text-3xl font-semibold tracking-tight">
            Learning that plays like a mission
          </h2>
          <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="panel relative p-5">
                <span className="absolute right-5 top-5 font-mono text-xs text-fg-subtle" aria-hidden="true">
                  0{i + 1}
                </span>
                <s.icon className="h-6 w-6 text-cyan" aria-hidden="true" />
                <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{s.body}</p>
                {s.title === "Learn" && (
                  <p className="mt-4 text-xs text-fg-subtle">
                    Live for {LESSON_WORLDS}. Lessons for the other worlds are in production; their challenges are already playable.
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* Worlds */}
        <section id="worlds" aria-labelledby="worlds-h" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 sm:px-6">
          <p className="eyebrow mb-2">The journey</p>
          <h2 id="worlds-h" className="font-display text-3xl font-semibold tracking-tight">
            Five worlds, in order
          </h2>
          <p className="mt-3 max-w-2xl text-fg-muted">
            Each world ends in a boss mission. Clear it to unlock the next.
          </p>
          <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            {catalog.missions.map((m) => {
              const s = summarizeMission(m);
              const v = worldVisual(m);
              return (
                <li
                  key={m.id}
                  className="panel group relative flex flex-col overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:border-line-strong"
                  style={accentStyle(m)}
                >
                  <div
                    aria-hidden="true"
                    className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
                    style={{ background: v.accent }}
                  />
                  <WorldEmblem mission={m} className="relative h-12 w-12" />
                  <p className="relative mt-4 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--accent)]">
                    {m.worldLabel}
                  </p>
                  <h3 className="relative mt-1 font-display text-lg font-semibold leading-tight">{m.title}</h3>
                  <p className="relative text-sm text-fg-muted">{m.subtitle}</p>
                  <p className="relative mt-3 flex-1 text-sm leading-relaxed text-fg-subtle">{m.tagline}</p>
                  <p className="relative mt-4 text-xs">
                    {m.items.some((i) => i.kind === "lesson" && i.availability.status === "available") ? (
                      <span className="text-emerald">● Video lessons + 3 challenges</span>
                    ) : (
                      <span className="text-fg-subtle">● 3 challenges · lessons in production</span>
                    )}
                  </p>
                  <div className="relative mt-3 space-y-2 border-t border-line pt-4 text-xs text-fg-muted">
                    <DifficultyMeter level={m.difficulty} />
                    <p className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />~{m.estimatedHours} h
                      </span>
                      <span className="font-medium text-[var(--accent)]">{s.totalXp} XP</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Principles */}
        <section aria-labelledby="principles-h" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="principles-h" className="sr-only">
            Principles
          </h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <li key={p.title} className="flex gap-4 rounded-2xl p-2">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.04] ring-1 ring-inset ring-line">
                  <p.icon className="h-5 w-5 text-emerald" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-fg-muted">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
          <div className="panel-raised flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Your first mission is waiting.</h2>
              <p className="mt-2 text-fg-muted">World 1 is unlocked. No account needed — progress stays in your browser.</p>
            </div>
            <ButtonLink href="/academy" size="lg">
              Start Learning <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo compact />
          <p>Independent portfolio project. Not affiliated with or endorsed by any institution. All data is synthetic.</p>
        </div>
      </footer>
    </div>
  );
}
