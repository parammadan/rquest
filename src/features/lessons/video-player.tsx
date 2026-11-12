"use client";

import { Captions, CaptionsOff, Clapperboard, ListVideo, ScrollText, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CaptionCue, VideoAsset } from "@/domain/types";
import { cn } from "@/lib/cn";

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

function activeIndex<T extends { startSec: number }>(items: T[], t: number) {
  let idx = -1;
  for (let i = 0; i < items.length; i++) if (items[i].startSec <= t + 0.05) idx = i;
  return idx;
}

/** Shown when a world's video hasn't been produced, or fails to load. */
export function VideoUnavailable({ video, reason }: { video: VideoAsset | undefined; reason: "planned" | "error" }) {
  return (
    <div className="panel flex aspect-video flex-col items-center justify-center gap-3 bg-[#060910] p-6 text-center">
      {reason === "planned" ? (
        <Clapperboard className="h-8 w-8 text-fg-subtle" aria-hidden="true" />
      ) : (
        <TriangleAlert className="h-8 w-8 text-gold" aria-hidden="true" />
      )}
      <p className="font-display text-lg font-semibold">
        {reason === "planned" ? "Video in production" : "The video couldn’t be loaded"}
      </p>
      <p className="max-w-md text-sm text-fg-muted">
        {reason === "planned"
          ? `“${video?.title ?? "This world’s video"}” hasn’t been produced yet. The written lesson covers the same material.`
          : "Check your connection and try again. The transcript below covers everything the video says."}
      </p>
    </div>
  );
}

export function VideoPlayer({
  video,
  focusChapterIds = [],
  onWatchedSeconds,
}: {
  video: VideoAsset;
  /** Chapters belonging to the current lesson: highlighted, and playback starts at the first. */
  focusChapterIds?: string[];
  onWatchedSeconds?: (seconds: number) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLOListElement>(null);
  const [t, setT] = useState(0);
  const [failed, setFailed] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [panel, setPanel] = useState<"chapters" | "transcript">("chapters");
  const watched = useRef(new Set<number>());

  const startAt = useMemo(
    () => video.chapters.find((c) => focusChapterIds.includes(c.id))?.startSec ?? 0,
    [video.chapters, focusChapterIds],
  );
  const chapterIdx = activeIndex(video.chapters, t);
  const cueIdx = activeIndex(video.transcript, t);

  // Captions on/off via the native text track.
  useEffect(() => {
    const track = ref.current?.textTracks?.[0];
    if (track) track.mode = captions ? "showing" : "hidden";
  }, [captions]);

  // Keep the active cue visible inside the transcript panel (without scrolling the page).
  useEffect(() => {
    const list = transcriptRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-cue="${cueIdx}"]`);
    if (list && el) {
      const top = el.offsetTop; // the list is the positioned parent
      if (top < list.scrollTop || top > list.scrollTop + list.clientHeight - el.clientHeight) {
        list.scrollTop = Math.max(0, top - list.clientHeight / 3);
      }
    }
  }, [cueIdx, panel]);

  const seek = (sec: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = sec;
    void v.play().catch(() => undefined);
  };

  if (video.status !== "ready" || (!video.sources.mp4 && !video.sources.youtubeId)) {
    return <VideoUnavailable video={video} reason="planned" />;
  }

  const useYouTube = !video.sources.mp4 && !!video.sources.youtubeId;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        {failed ? (
          <VideoUnavailable video={video} reason="error" />
        ) : useYouTube ? (
          <div className="panel overflow-hidden">
            <iframe
              className="aspect-video w-full"
              src={`https://www.youtube-nocookie.com/embed/${video.sources.youtubeId}?start=${Math.floor(startAt)}&cc_load_policy=1&rel=0`}
              title={video.title}
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="panel overflow-hidden bg-black">
            <video
              ref={ref}
              className="aspect-video w-full bg-black"
              controls
              playsInline
              preload="metadata"
              poster={video.poster ?? undefined}
              aria-label={`${video.title} (video with captions)`}
              data-testid="lesson-video"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (startAt > 0 && v.currentTime < 0.5) v.currentTime = startAt;
                const track = v.textTracks?.[0];
                if (track) track.mode = captions ? "showing" : "hidden";
              }}
              onTimeUpdate={(e) => {
                const now = e.currentTarget.currentTime;
                setT(now);
                if (!e.currentTarget.paused) {
                  watched.current.add(Math.floor(now));
                  onWatchedSeconds?.(watched.current.size);
                }
              }}
              onError={() => setFailed(true)}
            >
              <source src={video.sources.mp4!} type="video/mp4" onError={() => setFailed(true)} />
              {video.captionsVtt && <track kind="captions" src={video.captionsVtt} srcLang="en" label="English" default />}
            </video>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
          <span>
            {video.durationSec ? `${fmt(video.durationSec)} · ` : ""}
            {video.narration}
          </span>
          {!useYouTube && !failed && (
            <button
              type="button"
              onClick={() => setCaptions((c) => !c)}
              aria-pressed={captions}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-fg-muted hover:text-fg"
            >
              {captions ? <Captions className="h-3.5 w-3.5" aria-hidden="true" /> : <CaptionsOff className="h-3.5 w-3.5" aria-hidden="true" />}
              Captions {captions ? "on" : "off"}
            </button>
          )}
        </div>
      </div>

      <div className="panel flex max-h-[28rem] flex-col overflow-hidden">
        <div role="tablist" aria-label="Video navigation" className="flex border-b border-line">
          {(
            [
              ["chapters", "Chapters", ListVideo],
              ["transcript", "Transcript", ScrollText],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={panel === key}
              onClick={() => setPanel(key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm",
                panel === key ? "bg-white/[0.05] text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        {panel === "chapters" ? (
          <ol className="overflow-auto p-2" aria-label="Chapters">
            {video.chapters.map((c, i) => {
              const inLesson = focusChapterIds.includes(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => seek(c.startSec)}
                    disabled={useYouTube || failed}
                    aria-current={i === chapterIdx ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition disabled:cursor-default",
                      i === chapterIdx ? "bg-cyan/10 text-fg" : "text-fg-muted hover:bg-white/[0.03] hover:text-fg",
                    )}
                  >
                    <span className="w-10 shrink-0 font-mono text-xs text-fg-subtle">{fmt(c.startSec)}</span>
                    <span className="flex-1">{c.title}</span>
                    {inLesson && (
                      <span className="rounded-full border border-cyan/30 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase text-cyan">
                        this lesson
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <TranscriptList cues={video.transcript} active={cueIdx} listRef={transcriptRef} onSeek={useYouTube || failed ? undefined : seek} />
        )}
      </div>
    </div>
  );
}

function TranscriptList({
  cues,
  active,
  listRef,
  onSeek,
}: {
  cues: CaptionCue[];
  active: number;
  listRef: React.RefObject<HTMLOListElement | null>;
  onSeek?: (sec: number) => void;
}) {
  return (
    <ol ref={listRef} className="relative overflow-auto p-2 text-sm leading-relaxed" aria-label="Transcript">
      {cues.map((c, i) => (
        <li key={i} data-cue={i}>
          <button
            type="button"
            onClick={() => onSeek?.(c.startSec)}
            disabled={!onSeek}
            className={cn(
              "w-full rounded-lg px-3 py-1.5 text-left transition disabled:cursor-default",
              i === active ? "bg-violet/10 text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            <span className="mr-2 font-mono text-[0.65rem] text-fg-subtle">{fmt(c.startSec)}</span>
            {c.text}
          </button>
        </li>
      ))}
    </ol>
  );
}
