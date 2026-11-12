import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEV_TOOLS_ENABLED } from "@/features/progress/dev-scenarios";
import { DevScenariosScreen } from "@/features/progress/dev-scenarios-screen";

export const metadata: Metadata = { title: "Developer scenarios", robots: { index: false } };

export default function DevPage() {
  if (!DEV_TOOLS_ENABLED) notFound();
  return <DevScenariosScreen />;
}
