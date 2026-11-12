import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ------------------------------ theme ------------------------------ */

export const C = {
  bg: "#04060b",
  panel: "#0c111d",
  panel2: "#111827",
  line: "rgba(148,163,184,0.16)",
  lineStrong: "rgba(148,163,184,0.28)",
  text: "#e9edf6",
  muted: "#a3adc4",
  subtle: "#8390ab",
  violet: "#a78bfa",
  cyan: "#22d3ee",
  emerald: "#34d399",
  coral: "#fb7185",
  gold: "#fbbf24",
};
/** Code must read exactly as typed: no "<-" arrows or "|>" triangles. */
export const NO_LIGATURES: React.CSSProperties = { fontVariantLigatures: "none", fontFeatureSettings: "'liga' 0, 'calt' 0" };

export const FONT = {
  display: "Sora, sans-serif",
  sans: "Geist, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

/** Load the brand fonts before the first frame renders. */
export function useFonts() {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const faces = [
      new FontFace("Sora", `url(${staticFile("fonts/Sora.woff2")})`, { weight: "100 900" }),
      new FontFace("Geist", `url(${staticFile("fonts/Geist.woff2")})`, { weight: "100 900" }),
      new FontFace("JetBrains Mono", `url(${staticFile("fonts/JetBrainsMono.woff2")})`, { weight: "100 900" }),
    ];
    Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff))))
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
}

/* ------------------------------ timing ----------------------------- */

export function useSec() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
}

/** 0→1 over `dur` seconds starting at `at` (eased). */
export function ease(t: number, at: number, dur = 0.6) {
  return interpolate(t, [at, at + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });
}

export function useSpring(at: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at * fps, fps, config: { damping: 16, stiffness: 140 } });
}

export interface VideoTimeline {
  videoId: string;
  worldLabel: string;
  fps: number;
  intro: number;
  totalFrames: number;
  sentenceStarts: Record<string, number[]>;
  segments: { id: string; chapter: string; startFrame: number; frames: number; audioSec: number; caption: string }[];
}

/** The current video's timeline, provided by each video's root component. */
export const VideoContext = React.createContext<VideoTimeline | null>(null);
export function useTimeline(): VideoTimeline {
  const t = React.useContext(VideoContext);
  if (!t) throw new Error("VideoContext missing");
  return t;
}

/** Sentence start times (seconds, relative to the scene), aligned to the narration's word timestamps. */
export function useBeats(segmentId: string): number[] {
  return useTimeline().sentenceStarts[segmentId];
}

export const Appear: React.FC<{
  at: number;
  dy?: number;
  dur?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, dy = 18, dur = 0.6, style, children }) => {
  const t = useSec();
  const p = ease(t, at, dur);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * dy}px)`, ...style }}>{children}</div>;
};

/* --------------------------- R highlighting ------------------------ */

const KEYWORDS = new Set(["function", "if", "else", "for", "while", "return", "library", "TRUE", "FALSE", "NULL", "NA", "in"]);
const TOKEN =
  /(#[^\n]*)|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_.][\w.]*)(?=\s*\()|([A-Za-z_.][\w.]*)|(<-|\|>|==|!=|<=|>=|[-+*/^<>=!&|$~:])/g;

export function highlightR(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const [text, comment, str, num, fn, ident, op] = m;
    let color: string | undefined;
    if (comment) color = C.subtle;
    else if (str) color = C.emerald;
    else if (num) color = C.gold;
    else if (fn) color = KEYWORDS.has(fn) ? C.violet : C.cyan;
    else if (ident && KEYWORDS.has(ident)) color = C.violet;
    else if (op) color = C.coral;
    out.push(
      <span key={k++} style={{ color, fontStyle: comment ? "italic" : undefined }}>
        {text}
      </span>,
    );
    last = m.index + text.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

/* ------------------------------ panels ----------------------------- */

export const Panel: React.FC<{ style?: React.CSSProperties; children: React.ReactNode; title?: string }> = ({
  style,
  children,
  title,
}) => (
  <div
    style={{
      background: `linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.01)), ${C.panel}`,
      border: `1px solid ${C.line}`,
      borderRadius: 22,
      boxShadow: "0 30px 60px -30px rgba(0,0,0,0.7)",
      overflow: "hidden",
      ...style,
    }}
  >
    {title && (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 22px",
          borderBottom: `1px solid ${C.line}`,
          fontFamily: FONT.mono,
          fontSize: 20,
          color: C.muted,
        }}
      >
        <span style={{ width: 11, height: 11, borderRadius: 99, background: "rgba(251,113,133,0.6)" }} />
        <span style={{ width: 11, height: 11, borderRadius: 99, background: "rgba(251,191,36,0.6)" }} />
        <span style={{ width: 11, height: 11, borderRadius: 99, background: "rgba(52,211,153,0.6)" }} />
        <span style={{ marginLeft: 10 }}>{title}</span>
      </div>
    )}
    {children}
  </div>
);

export interface CodeLine {
  code: string;
  /** Seconds at which this line starts typing. */
  at: number;
  /** Console output revealed after the line finishes. */
  out?: string;
  outColor?: string;
}

/** An R editor/console: lines type in, output appears, lines can be highlighted. */
export const Code: React.FC<{
  lines: CodeLine[];
  highlight?: { lines: number[]; from: number; to?: number; color?: string }[];
  fontSize?: number;
  title?: string;
  style?: React.CSSProperties;
}> = ({ lines, highlight = [], fontSize = 30, title = "console.R", style }) => {
  const t = useSec();
  const CPS = 42; // typing speed, characters per second
  return (
    <Panel title={title} style={style}>
      <div style={{ padding: "22px 28px", fontFamily: FONT.mono, fontSize, lineHeight: 1.55 }}>
        {lines.map((l, i) => {
          if (t < l.at) return null;
          const shown = Math.min(l.code.length, Math.floor((t - l.at) * CPS));
          const done = shown >= l.code.length;
          const doneAt = l.at + l.code.length / CPS;
          const hlEntry = highlight.find((h) => h.lines.includes(i) && t >= h.from && (h.to === undefined || t < h.to));
          const hl = !!hlEntry;
          const hlColor = hlEntry?.color ?? C.cyan;
          return (
            <div key={i}>
              <div
                style={{
                  whiteSpace: "pre",
                  color: C.text,
                  background: hl ? `color-mix(in srgb, ${hlColor} 12%, transparent)` : "transparent",
                  boxShadow: hl ? `inset 4px 0 0 ${hlColor}` : "none",
                  margin: "0 -28px",
                  padding: "0 28px",
                  transition: "none",
                }}
              >
                {highlightR(l.code.slice(0, shown))}
                {!done && <span style={{ background: C.cyan, width: 3, display: "inline-block", height: "1.1em", verticalAlign: "-0.15em", marginLeft: 2 }} />}
              </div>
              {l.out && done && (
                <div
                  style={{
                    whiteSpace: "pre",
                    color: l.outColor ?? C.muted,
                    opacity: ease(t, doneAt + 0.15, 0.4),
                    marginBottom: 4,
                  }}
                >
                  {l.out}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

/** A row of vector cells with 1-based index labels. */
export const Cells: React.FC<{
  values: (string | null)[];
  at: number;
  color?: (v: string | null, i: number) => string;
  width?: number;
  label?: string;
  stagger?: number;
}> = ({ values, at, color, width = 170, label, stagger = 0.08 }) => {
  const t = useSec();
  return (
    <div>
      {label && (
        <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.subtle, marginBottom: 10, opacity: ease(t, at) }}>
          {label}
        </div>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        {values.map((v, i) => {
          const p = ease(t, at + i * stagger, 0.45);
          const col = color ? color(v, i) : v === null ? C.gold : C.cyan;
          return (
            <div key={i} style={{ opacity: p, transform: `translateY(${(1 - p) * 20}px)`, width }}>
              <div
                style={{
                  height: 78,
                  borderRadius: 14,
                  border: `2px solid ${col}`,
                  background: `color-mix(in srgb, ${col} 12%, ${C.panel})`,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: FONT.mono,
                  fontSize: 26,
                  color: v === null ? C.gold : C.text,
                  whiteSpace: "pre",
                }}
              >
                {v === null ? "NA" : v}
              </div>
              <div style={{ textAlign: "center", fontFamily: FONT.mono, fontSize: 18, color: C.subtle, marginTop: 6 }}>
                [{i + 1}]
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Table: React.FC<{
  columns: string[];
  rows: (string | number | null)[][];
  at: number;
  rowStyle?: (i: number) => React.CSSProperties;
  colWidths?: number[];
  fontSize?: number;
}> = ({ columns, rows, at, rowStyle, colWidths, fontSize = 26 }) => {
  const t = useSec();
  const grid = (colWidths ?? columns.map(() => 1)).map((w) => `${w}fr`).join(" ");
  return (
    <Panel style={{ opacity: ease(t, at) }}>
      <div style={{ fontFamily: FONT.mono, fontSize }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: grid,
            padding: "14px 24px",
            color: C.subtle,
            borderBottom: `1px solid ${C.line}`,
            fontSize: fontSize * 0.82,
          }}
        >
          {columns.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: grid,
              padding: "11px 24px",
              borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none",
              color: C.text,
              opacity: ease(t, at + 0.15 + i * 0.07, 0.4),
              ...rowStyle?.(i),
            }}
          >
            {r.map((v, j) => (
              <div key={j} style={{ color: v === null ? C.gold : undefined }}>
                {v === null ? "NA" : String(v)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Panel>
  );
};

export const Chip: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({
  children,
  color = C.cyan,
  style,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 20px",
      borderRadius: 999,
      border: `1.5px solid color-mix(in srgb, ${color} 45%, transparent)`,
      background: `color-mix(in srgb, ${color} 12%, transparent)`,
      color,
      fontFamily: FONT.sans,
      fontSize: 26,
      fontWeight: 500,
      ...style,
    }}
  >
    {children}
  </span>
);

export const Heading: React.FC<{ kicker: string; title: string; at?: number; color?: string }> = ({ kicker, title, at = 0, color = C.cyan }) => {
  const t = useSec();
  const p = ease(t, at, 0.7);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 14}px)` }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: "0.18em", textTransform: "uppercase", color }}>
        {kicker}
      </div>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: C.text, letterSpacing: "-0.02em", marginTop: 8 }}>
        {title}
      </div>
    </div>
  );
};

/* ------------------------------ frame ------------------------------ */

export const LogoMark: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size}>
    <defs>
      <linearGradient id="vmark" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="55%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#34d399" />
      </linearGradient>
    </defs>
    <path d="M20 2.5 35.2 11.25v17.5L20 37.5 4.8 28.75v-17.5Z" fill="#0c111d" stroke="url(#vmark)" strokeWidth="2" />
    <circle cx="12" cy="27" r="2.6" fill="#a78bfa" />
    <circle cx="20" cy="20" r="2.6" fill="#22d3ee" />
    <circle cx="28" cy="13" r="3.4" fill="#34d399" />
  </svg>
);

/** Background, header, chapter label, and progress bar shared by every scene. */
export const Frame: React.FC<{ chapter: string; children: React.ReactNode }> = ({ chapter, children }) => {
  const { worldLabel } = useTimeline();
  return (
    <AbsoluteFill style={{ background: C.bg, color: C.text, fontFamily: FONT.sans, ...NO_LIGATURES }}>
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.11) 1px, transparent 0)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse at 40% 20%, black 30%, transparent 80%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(60% 50% at 15% 10%, rgba(139,92,246,0.14), transparent 60%), radial-gradient(50% 50% at 90% 90%, rgba(34,211,238,0.09), transparent 60%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 80,
          right: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <LogoMark />
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 28 }}>
            R<span style={{ color: C.cyan }}>Quest</span>
          </div>
          <div style={{ width: 1, height: 28, background: C.lineStrong, margin: "0 8px" }} />
          <div style={{ fontFamily: FONT.mono, fontSize: 20, letterSpacing: "0.16em", color: C.subtle }}>
            {worldLabel}
          </div>
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase" }}>
          {chapter}
        </div>
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 130, bottom: 90 }}>{children}</div>
      <ProgressBar />
    </AbsoluteFill>
  );
};

/** The composition-level frame, so the progress bar spans the whole video. */
export const AbsoluteFrame = React.createContext(0);
const ProgressBar: React.FC = () => {
  const f = React.useContext(AbsoluteFrame);
  const timeline = useTimeline();
  const pct = Math.min(1, f / timeline.totalFrames);
  const starts = timeline.segments
    .filter((s, i, a) => a.findIndex((x) => x.chapter === s.chapter) === i)
    .map((s) => s.startFrame / timeline.totalFrames);
  return (
    <div style={{ position: "absolute", left: 80, right: 80, bottom: 44, height: 6, borderRadius: 99, background: "rgba(148,163,184,0.14)" }}>
      <div
        style={{
          height: "100%",
          width: `${pct * 100}%`,
          borderRadius: 99,
          background: "linear-gradient(90deg,#a78bfa,#22d3ee,#34d399)",
        }}
      />
      {starts.map((s) => (
        <div key={s} style={{ position: "absolute", left: `${s * 100}%`, top: -5, width: 2, height: 16, background: "rgba(233,237,246,0.35)" }} />
      ))}
    </div>
  );
};
