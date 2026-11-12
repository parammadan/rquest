import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalog } from "@/content/catalog";
import { ChallengeGate } from "@/features/challenges/challenge-workspace";

/** Only catalog routes exist; anything else is a 404 (required for static export). */
export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.missions.flatMap((m) =>
    m.items.filter((i) => i.kind === "challenge").map((i) => ({ missionId: m.id, challengeId: i.id })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/academy/missions/[missionId]/challenges/[challengeId]">): Promise<Metadata> {
  const { challengeId } = await params;
  return { title: catalog.getItem(challengeId)?.title ?? "Challenge not found" };
}

export default async function ChallengePage({
  params,
}: PageProps<"/academy/missions/[missionId]/challenges/[challengeId]">) {
  const { missionId, challengeId } = await params;
  const item = catalog.getItem(challengeId);
  if (!item || item.kind !== "challenge" || item.missionId !== missionId) notFound();
  return <ChallengeGate key={challengeId} missionId={missionId} challengeId={challengeId} />;
}
