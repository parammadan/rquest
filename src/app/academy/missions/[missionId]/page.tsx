import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalog, isMissionId } from "@/content/catalog";
import { MissionDetailGate } from "@/features/missions/mission-detail";

/** Only catalog routes exist; anything else is a 404 (required for static export). */
export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.missions.map((m) => ({ missionId: m.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/academy/missions/[missionId]">): Promise<Metadata> {
  const { missionId } = await params;
  const mission = catalog.getMission(missionId);
  return { title: mission ? `${mission.worldLabel}: ${mission.title}` : "Mission not found" };
}

export default async function MissionPage({ params }: PageProps<"/academy/missions/[missionId]">) {
  const { missionId } = await params;
  if (!isMissionId(missionId)) notFound();
  // key: reset per-mission UI state (selected item) when switching worlds.
  return <MissionDetailGate key={missionId} missionId={missionId} />;
}
