import type { MissionId, VideoAsset } from "../domain/types.ts";
import { asset } from "../lib/asset.ts";
import { generated as dataLabV1 } from "./videos/data-lab-v1.generated.ts";
import { generated as packageFactoryV1 } from "./videos/package-factory-v1.generated.ts";
import { generated as debuggingCrisisV1 } from "./videos/debugging-crisis-v1.generated.ts";
import { generated as qualityControlV1 } from "./videos/quality-control-v1.generated.ts";
import { generated as researchMissionV1 } from "./videos/research-mission-v1.generated.ts";
import { generated as dataLabDebrief } from "./videos/data-lab-debrief-v1.generated.ts";
import { generated as packageFactoryDebrief } from "./videos/package-factory-debrief-v1.generated.ts";
import { generated as debuggingCrisisDebrief } from "./videos/debugging-crisis-debrief-v1.generated.ts";
import { generated as qualityControlDebrief } from "./videos/quality-control-debrief-v1.generated.ts";
import { generated as researchMissionDebrief } from "./videos/research-mission-debrief-v1.generated.ts";

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

const NARRATION = "AI narration (Kokoro text-to-speech, voice am_onyx). Every clip was read back by speech recognition to catch mispronunciations.";

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
    narration: NARRATION,
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
    narration: NARRATION,
  },
  {
    id: "debugging-crisis.video",
    missionId: "debugging-crisis",
    title: "When R Works on One Machine Only",
    summary: "The search path and masking, lexical scoping and pure functions, working directories, options, restoring state, and provenance. About three and a half minutes.",
    status: "ready",
    durationSec: debuggingCrisisV1.durationSec,
    sources: { mp4: mediaUrl("debugging-crisis-v1.mp4"), youtubeId: null },
    captionsVtt: asset("/captions/debugging-crisis-v1.vtt"),
    poster: asset("/posters/debugging-crisis-v1.jpg"),
    chapters: debuggingCrisisV1.chapters,
    transcript: debuggingCrisisV1.transcript,
    narration: NARRATION,
  },
  {
    id: "quality-control.video",
    missionId: "quality-control",
    title: "Testing and Independent QC",
    summary: "testthat expectations, tests that catch mutants, validation with classed errors, independent double programming, tolerance, and the discrepancy report. About three minutes.",
    status: "ready",
    durationSec: qualityControlV1.durationSec,
    sources: { mp4: mediaUrl("quality-control-v1.mp4"), youtubeId: null },
    captionsVtt: asset("/captions/quality-control-v1.vtt"),
    poster: asset("/posters/quality-control-v1.jpg"),
    chapters: qualityControlV1.chapters,
    transcript: qualityControlV1.transcript,
    narration: NARRATION,
  },
  {
    id: "research-mission.video",
    missionId: "research-mission",
    title: "Reproducible Statistical Programming",
    summary: "Seeds and RNG kinds, restoring the caller's random stream, computed reporting, the primary analysis, and byte-identical re-runs. About three minutes.",
    status: "ready",
    durationSec: researchMissionV1.durationSec,
    sources: { mp4: mediaUrl("research-mission-v1.mp4"), youtubeId: null },
    captionsVtt: asset("/captions/research-mission-v1.vtt"),
    poster: asset("/posters/research-mission-v1.jpg"),
    chapters: researchMissionV1.chapters,
    transcript: researchMissionV1.transcript,
    narration: NARRATION,
  },
];

/*
 * Boss debriefs: one short video per world, shown in the boss workspace only after that boss
 * is cleared. Each walks through the reference solution the validator self-test proves passes
 * every check, then the mistakes that fail them.
 */
type Generated = { durationSec: number; chapters: VideoAsset["chapters"]; transcript: VideoAsset["transcript"] };
const debrief = (missionId: MissionId, title: string, summary: string, generated: Generated | null): VideoAsset => {
  const file = `${missionId}-debrief-v1`;
  return generated
    ? {
        id: `${missionId}.debrief`,
        missionId,
        kind: "debrief",
        title,
        summary,
        status: "ready",
        durationSec: generated.durationSec,
        sources: { mp4: mediaUrl(`${file}.mp4`), youtubeId: null },
        captionsVtt: asset(`/captions/${file}.vtt`),
        poster: asset(`/posters/${file}.jpg`),
        chapters: generated.chapters,
        transcript: generated.transcript,
        narration: NARRATION,
      }
    : { ...planned(missionId, title, summary), id: `${missionId}.debrief`, kind: "debrief" };
};

export const DEBRIEF_VIDEOS: VideoAsset[] = [
  debrief("data-lab", "Debrief: The Messy Export", "How a passing prepare_enrollment() reads, parses, and types the export, and the mistakes that fail the checks.", dataLabDebrief),
  debrief("package-factory", "Debrief: Ship labtools 0.1.0", "How the documentation, examples, and imports pass every package check, and the mistakes that fail them.", packageFactoryDebrief),
  debrief("debugging-crisis", "Debrief: Works On My Machine", "How run_report() stops borrowing from the session and records its provenance, and the mistakes that fail the checks.", debuggingCrisisDebrief),
  debrief("quality-control", "Debrief: Independent QC", "How the QC table and a tolerance-based comparison find the production bug and nothing else, and the mistakes that fail the checks.", qualityControlDebrief),
  debrief("research-mission", "Debrief: The Reviewer Re-run", "How the analysis, pinned randomness, and stable files survive a reviewer's re-run, and the mistakes that fail the checks.", researchMissionDebrief),
];

const byId = new Map([...VIDEOS, ...DEBRIEF_VIDEOS].map((v) => [v.id, v]));
export const getVideo = (id: string) => byId.get(id);
export const getDebrief = (missionId: MissionId) => byId.get(`${missionId}.debrief`);
