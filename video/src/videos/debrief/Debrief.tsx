import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { AbsoluteFrame, Appear, C, Chip, ease, FONT, Frame, Heading, highlightR, LogoMark, Panel, useBeats, useFonts, useSec, useSpring, VideoContext, type VideoTimeline } from "../../kit";

/*
 * Generic boss-debrief video, driven entirely by data in projects/<debrief-id>/:
 * script.json segments carry a `visual` describing what to show while they're narrated.
 * The reference solution shown is the one the validator self-test proves passes every check.
 */

export type DebriefVisual =
  | { type: "brief"; title: string; items: string[] }
  | { type: "code"; title: string; file: string; from: number; to: number; highlights: number[][] }
  | { type: "mistakes"; title: string; items: { mistake: string; check: string }[] }
  | { type: "checks"; title: string; items: string[] };

export interface DebriefData {
  boss: string;
  accent: string;
  code: string;
}

export type Seg = VideoTimeline["segments"][number] & { visual: DebriefVisual; chapterTitle: string };

const Code: React.FC<{ seg: Seg; v: Extract<DebriefVisual, { type: "code" }>; code: string; accent: string }> = ({ seg, v, code, accent }) => {
  const t = useSec();
  const b = useBeats(seg.id);
  const lines = code.split("\n").slice(v.from - 1, v.to);
  // Highlight group k is active from sentence k onwards (until the next group).
  let active = -1;
  v.highlights.forEach((_, k) => {
    if (t >= (b[k] ?? Infinity)) active = k;
  });
  const hl = active >= 0 ? v.highlights[active] : [];
  return (
    <Panel title={v.file} style={{ opacity: ease(t, 0.1, 0.4) }}>
      <div style={{ padding: "16px 24px", fontFamily: FONT.mono, fontSize: lines.length > 16 ? 21 : 24, lineHeight: 1.55 }}>
        {lines.map((l, i) => {
          const n = v.from + i;
          const on = hl.includes(n);
          return (
            <div
              key={i}
              style={{
                whiteSpace: "pre",
                background: on ? `color-mix(in srgb, ${accent} 14%, transparent)` : "transparent",
                boxShadow: on ? `inset 4px 0 0 ${accent}` : "none",
                margin: "0 -24px",
                padding: "0 24px",
                opacity: hl.length && !on ? 0.55 : 1,
              }}
            >
              <span style={{ color: C.subtle, marginRight: 22, display: "inline-block", width: 30, textAlign: "right" }}>{n}</span>
              {l.startsWith("#'") ? <span style={{ color: C.subtle }}>{l}</span> : highlightR(l)}
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

const Scene: React.FC<{ seg: Seg; data: DebriefData }> = ({ seg, data }) => {
  const b = useBeats(seg.id);
  const v = seg.visual;
  const A = data.accent;
  return (
    <Frame chapter={seg.chapterTitle}>
      <Heading kicker={`Boss debrief · ${data.boss}`} title={v.title} color={A} />
      <div style={{ marginTop: 40 }}>
        {v.type === "brief" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {v.items.map((x, i) => (
              <Appear key={x} at={(b[Math.min(i + 1, b.length - 1)] ?? 0) + 0.2}>
                <Panel style={{ padding: "18px 26px", display: "flex", gap: 20, alignItems: "center" }}>
                  <span style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 700, color: A, width: 40 }}>{i + 1}</span>
                  <span style={{ fontSize: 30 }}>{x}</span>
                </Panel>
              </Appear>
            ))}
          </div>
        )}
        {v.type === "code" && <Code seg={seg} v={v} code={data.code} accent={A} />}
        {v.type === "mistakes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {v.items.map((m, i) => (
              <Appear key={m.mistake} at={(b[Math.min(i + 1, b.length - 1)] ?? 0) + 0.2}>
                <Panel style={{ padding: "18px 26px", display: "flex", gap: 24, alignItems: "center", borderColor: "rgba(251,113,133,0.35)" }}>
                  <span style={{ color: C.coral, fontSize: 30 }}>✗</span>
                  <span style={{ fontSize: 28, flex: 1 }}>{m.mistake}</span>
                  <Chip color={C.gold} style={{ fontSize: 20 }}>fails: {m.check}</Chip>
                </Panel>
              </Appear>
            ))}
          </div>
        )}
        {v.type === "checks" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {v.items.map((x, i) => (
              <Appear key={x} at={0.6 + i * 0.5}>
                <Panel style={{ padding: "18px 24px", display: "flex", gap: 16, alignItems: "center", borderColor: "rgba(52,211,153,0.35)" }}>
                  <span style={{ color: C.emerald, fontSize: 28 }}>✓</span>
                  <span style={{ fontSize: 26 }}>{x}</span>
                </Panel>
              </Appear>
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
};

const Card: React.FC<{ data: DebriefData; worldLabel: string; title: string; sub: string }> = ({ data, worldLabel, title, sub }) => {
  const t = useSec();
  const s = useSpring(0.15);
  return (
    <AbsoluteFill style={{ background: C.bg, display: "grid", placeItems: "center" }}>
      <AbsoluteFill style={{ background: `radial-gradient(50% 45% at 50% 45%, color-mix(in srgb, ${data.accent} 22%, transparent), transparent 70%)` }} />
      <div style={{ textAlign: "center", opacity: s, transform: `scale(${0.92 + 0.08 * s})` }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LogoMark size={100} />
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 24, letterSpacing: "0.22em", color: data.accent, marginTop: 30, opacity: ease(t, 0.4) }}>{worldLabel} · BOSS DEBRIEF</div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 78, color: C.text, marginTop: 14, opacity: ease(t, 0.7) }}>{title}</div>
        <div style={{ fontSize: 30, color: C.muted, marginTop: 12, opacity: ease(t, 1) }}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

export const makeDebrief = (timeline: Omit<VideoTimeline, "segments"> & { segments: Seg[] }, data: DebriefData) => {
  const DebriefVideo: React.FC = () => {
    useFonts();
    const frame = useCurrentFrame();
    const introFrames = Math.round(timeline.intro * timeline.fps);
    const last = timeline.segments[timeline.segments.length - 1];
    const lead = Math.round(0.6 * timeline.fps);
    return (
      <VideoContext.Provider value={timeline}>
        <AbsoluteFrame.Provider value={frame}>
          <AbsoluteFill style={{ background: C.bg }}>
            <Sequence durationInFrames={introFrames}>
              <Card data={data} worldLabel={timeline.worldLabel.split(" · ")[0]} title={data.boss} sub="How a strong solution works, and the mistakes that fail the checks" />
            </Sequence>
            {timeline.segments.map((s) => (
              <Sequence key={s.id} from={s.startFrame} durationInFrames={s.frames}>
                <Scene seg={s} data={data} />
                <Sequence from={lead}>
                  <Audio src={staticFile(`projects/${timeline.videoId}/audio/${s.id}.mp3`)} />
                </Sequence>
              </Sequence>
            ))}
            <Sequence from={last.startFrame + last.frames}>
              <Card data={data} worldLabel={timeline.worldLabel.split(" · ")[0]} title="Debrief complete" sub="RQuest · all data synthetic · independent project" />
            </Sequence>
          </AbsoluteFill>
        </AbsoluteFrame.Provider>
      </VideoContext.Provider>
    );
  };
  return DebriefVideo;
};
