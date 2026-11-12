"use client";

import { FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/shell/page-header";
import { DEV_SCENARIOS } from "./dev-scenarios";
import { useProgress, useProgressActions } from "./progress-provider";

export function DevScenariosScreen() {
  const { progress } = useProgress();
  const { loadScenario, exitScenario } = useProgressActions();
  const router = useRouter();
  const active = progress.origin === "dev-scenario" ? progress.scenarioName : null;

  return (
    <>
      <PageHeader
        eyebrow="Developer tools · not shown in production"
        title="Seeded scenarios"
        description="Load seeded progress to visually verify locked, active, and completed states. Scenarios use a separate storage key, show a banner on every page while active, and never modify the real learner's progress."
      />
      <ul className="grid gap-4 md:grid-cols-3">
        {DEV_SCENARIOS.map((s) => (
          <li key={s.id} className="panel flex flex-col gap-3 border-dashed border-gold/30 p-5">
            <FlaskConical className="h-5 w-5 text-gold" aria-hidden="true" />
            <h2 className="font-display font-semibold">{s.name}</h2>
            <p className="flex-1 text-sm text-fg-muted">{s.description}</p>
            <Button
              variant="secondary"
              size="sm"
              aria-pressed={active === s.name}
              onClick={() => {
                if (loadScenario(s.id)) router.push("/academy/map");
              }}
            >
              {active === s.name ? "Active — reload" : "Load scenario"}
            </Button>
          </li>
        ))}
      </ul>
      {active && (
        <Button variant="ghost" className="mt-6" onClick={exitScenario}>
          Exit scenario and return to real progress
        </Button>
      )}
    </>
  );
}
