"use client";

import { Award, ChartNoAxesColumn, FlaskConical, LayoutDashboard, Map as MapIcon, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/features/brand/logo";
import { DEV_TOOLS_ENABLED } from "@/features/progress/dev-scenarios";
import { useProgress, useProgressActions } from "@/features/progress/progress-provider";
import { cn } from "@/lib/cn";
import { LearnerCard } from "./learner-widgets";

export const NAV_ITEMS = [
  { href: "/academy", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/academy/map", label: "Mission Map", icon: MapIcon, match: ["/academy/map", "/academy/missions"] },
  { href: "/academy/achievements", label: "Achievements", icon: Award },
  { href: "/academy/progress", label: "Progress", icon: ChartNoAxesColumn },
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

function isActive(item: NavItem, rawPathname: string | null) {
  if (!rawPathname) return false;
  // Static hosting adds trailing slashes (/academy/); compare without them.
  const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/+$/, "") : rawPathname;
  if ("exact" in item && item.exact) return pathname === item.href;
  const prefixes = "match" in item ? item.match : [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function NavLinks({ variant }: { variant: "sidebar" | "tabbar" }) {
  const pathname = usePathname();
  return <NavList variant={variant} pathname={pathname} />;
}

function NavList({ variant, pathname }: { variant: "sidebar" | "tabbar"; pathname: string | null }) {
  return (
    <ul className={variant === "sidebar" ? "space-y-1" : "grid grid-cols-4"}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                variant === "sidebar"
                  ? "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
                  : "flex flex-col items-center gap-1 px-1 py-2 text-[0.68rem] font-medium transition",
                active ? "text-fg" : "text-fg-muted hover:text-fg",
                variant === "sidebar" && (active ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"),
              )}
            >
              {variant === "sidebar" && active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[linear-gradient(#a78bfa,#22d3ee)]"
                />
              )}
              <Icon
                className={cn("h-[18px] w-[18px] shrink-0", active ? "text-cyan" : "text-fg-subtle group-hover:text-fg-muted")}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Banner shown whenever seeded developer data is being displayed. */
function DevScenarioBanner({ className }: { className?: string }) {
  const { progress } = useProgress();
  const { exitScenario } = useProgressActions();
  if (progress.origin !== "dev-scenario") return null;
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-gold/40 bg-[repeating-linear-gradient(135deg,rgb(251_191_36/0.16)_0_12px,rgb(251_191_36/0.08)_12px_24px)] px-4 py-2 text-center text-xs text-gold backdrop-blur",
        className,
      )}
    >
      <span>
        <strong className="font-semibold">Developer scenario:</strong> “{progress.scenarioName}”. Seeded test data —
        not real learner activity.
      </span>
      <button
        type="button"
        onClick={exitScenario}
        className="inline-flex items-center gap-1 rounded-md border border-gold/40 px-2 py-0.5 font-medium hover:bg-gold/10"
      >
        <X className="h-3 w-3" aria-hidden="true" /> Exit scenario
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink-800 focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      {/* Ambient backdrop */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-violet/[0.07] blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-cyan/[0.05] blur-3xl" />
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-ink-900/80 px-4 py-6 backdrop-blur-xl lg:flex">
        <Link href="/" className="mb-8 px-2" aria-label="RQuest home">
          <Logo />
        </Link>
        <nav aria-label="Academy">
          <p className="eyebrow mb-2 px-3">Academy</p>
          <Suspense fallback={<NavList variant="sidebar" pathname={null} />}>
            <NavLinks variant="sidebar" />
          </Suspense>
        </nav>
        {DEV_TOOLS_ENABLED && (
          <Link
            href="/academy/dev"
            className="mt-6 flex items-center gap-2 rounded-xl border border-dashed border-gold/30 px-3 py-2 text-xs text-gold/90 hover:bg-gold/5"
          >
            <FlaskConical className="h-4 w-4" aria-hidden="true" /> Dev scenarios
          </Link>
        )}
        <div className="mt-auto">
          <LearnerCard />
        </div>
      </aside>

      {/* Mobile / tablet top bar */}
      <div className="sticky top-0 z-30 lg:hidden">
        <header className="flex items-center justify-between border-b border-line bg-ink-900/85 px-4 py-3 backdrop-blur-xl">
          <Link href="/" aria-label="RQuest home">
            <Logo compact />
          </Link>
          <LearnerCard compact />
        </header>
        <DevScenarioBanner />
      </div>

      <main id="main" className="pb-28 lg:pb-12 lg:pl-64">
        <DevScenarioBanner className="sticky top-0 z-20 hidden lg:flex" />
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</div>
      </main>

      {/* Mobile / tablet tab bar */}
      <nav
        aria-label="Academy"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink-900/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <Suspense fallback={<NavList variant="tabbar" pathname={null} />}>
          <NavLinks variant="tabbar" />
        </Suspense>
      </nav>
    </div>
  );
}
