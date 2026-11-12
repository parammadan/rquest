import type { MissionId, VideoAsset } from "../domain/types.ts";
import { asset } from "../lib/asset.ts";
import { generated as dataLabV1 } from "./videos/data-lab-v1.generated.ts";
import { generated as packageFactoryV1 } from "./videos/package-factory-v1.generated.ts";

/*
 * One instructional video per world, shared by that world's lessons.
 *
 * MP4s are not committed to git. They are published as GitHub Release assets
 * (tag media-*) and copied into the site's /media/ folder at deploy time.
 * Set NEXT_PUBLIC_RQUEST_MEDIA_BASE to serve them from object storage or a CDN instead.
 */
export function mediaUrl(file: string): string {
  const base = process.env.NEXT_PUBLIC_RQUEST_MEDIA_BASE;
  return base ? `${base.replace(/\/$/, "")}/${file}` : asset(`/media/${file}`);
}

const planned = (missionId: MissionId, title: string, summary: string): VideoAsset => ({
  id: `${missionId}.video`,
  missionId,
  title,
  summary,
  status: "planned",
  durationSec: null,
  sources: { mp4: null, youtubeId: null },
  captionsVtt: null,
  poster: null,
  chapters: [],
  transcript: [],
  narration: null,
});

export const VIDEOS: readonly VideoAsset[] = [
  {
    id: "data-lab.video",
    missionId: "data-lab",
    title: "Introduction to R for Research Programmers",
    summary:
      "Vectors, functions, missing values, and data frames, applied to a messy synthetic study export. About three minutes.",
    status: "ready",
    durationSec: dataLabV1.durationSec,
    sources: { mp4: mediaUrl("data-lab-v1.mp4"), youtubeId: null },
    captionsVtt: asset("/captions/data-lab-v1.vtt"),
    poster: asset("/posters/data-lab-v1.jpg"),
    chapters: dataLabV1.chapters,
    transcript: dataLabV1.transcript,
    narration: "AI narration (Kokoro text-to-speech, voice am_onyx). Every clip was read back by speech recognition to catch mispronunciations.",
  },
  {
    id: "package-factory.video",
    missionId: "package-factory",
    title: "From R Scripts to Research-Ready Packages",
    summary:
      "DESCRIPTION and NAMESPACE, roxygen2, dependencies, testthat, build and check, and versioning, all with one real example package. About four and a half minutes.",
    status: "ready",
    durationSec: packageFactoryV1.durationSec,
    sources: { mp4: mediaUrl("package-factory-v1.mp4"), youtubeId: null },
    captionsVtt: asset("/captions/package-factory-v1.vtt"),
    poster: asset("/posters/package-factory-v1.jpg"),
    chapters: packageFactoryV1.chapters,
    transcript: packageFactoryV1.transcript,
    narration: "AI narration (Kokoro text-to-speech, voice am_onyx). Every clip was read back by speech recognition to catch mispronunciations.",
  },
  planned("debugging-crisis", "Debugging R Environments", "Masking, scoping, and making a report run in any session."),
  planned("quality-control", "Testing and Independent QC", "testthat, mutation thinking, defensive errors, and double programming."),
  planned("research-mission", "Reproducible Statistical Programming", "Seeds, RNG kinds, computed reporting, and byte-identical re-runs."),
];

const byId = new Map(VIDEOS.map((v) => [v.id, v]));
export const getVideo = (id: string) => byId.get(id);
