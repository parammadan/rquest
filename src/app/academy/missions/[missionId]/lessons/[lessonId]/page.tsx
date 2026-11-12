import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalog } from "@/content/catalog";
import { LessonGate } from "@/features/lessons/lesson-experience";

/** Only catalog routes exist; anything else is a 404 (required for static export). */
export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.missions.flatMap((m) =>
    m.items.filter((i) => i.kind === "lesson").map((i) => ({ missionId: m.id, lessonId: i.id })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/academy/missions/[missionId]/lessons/[lessonId]">): Promise<Metadata> {
  const { lessonId } = await params;
  return { title: catalog.getItem(lessonId)?.title ?? "Lesson not found" };
}

export default async function LessonPage({ params }: PageProps<"/academy/missions/[missionId]/lessons/[lessonId]">) {
  const { missionId, lessonId } = await params;
  const item = catalog.getItem(lessonId);
  if (!item || item.kind !== "lesson" || item.missionId !== missionId) notFound();
  return <LessonGate key={lessonId} missionId={missionId} lessonId={lessonId} />;
}
