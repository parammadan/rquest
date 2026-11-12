import React from "react";
import { C, ease, FONT, highlightR, Panel, useSec } from "./kit";

/* Shared scene blocks: source files, file trees, and terminal output. */

/** A file shown as a panel with R/Rd/DESCRIPTION-aware colouring; lines can be revealed and highlighted. */
export const File: React.FC<{
  name: string;
  lines: string[];
  at: number;
  stagger?: number;
  highlight?: { lines: number[]; from: number; to?: number; color?: string }[];
  fontSize?: number;
  style?: React.CSSProperties;
  plain?: boolean;
}> = ({ name, lines, at, stagger = 0.12, highlight = [], fontSize = 24, style, plain }) => {
  const t = useSec();
  return (
    <Panel title={name} style={{ opacity: ease(t, at - 0.3, 0.4), ...style }}>
      <div style={{ padding: "16px 24px", fontFamily: FONT.mono, fontSize, lineHeight: 1.55 }}>
        {lines.map((l, i) => {
          const hl = highlight.find((h) => h.lines.includes(i) && t >= h.from && (h.to === undefined || t < h.to));
          const p = ease(t, at + i * stagger, 0.35);
          return (
            <div
              key={i}
              style={{
                whiteSpace: "pre",
                opacity: p,
                color: plain ? C.muted : C.text,
                background: hl ? `color-mix(in srgb, ${hl.color ?? C.cyan} 14%, transparent)` : "transparent",
                boxShadow: hl ? `inset 4px 0 0 ${hl.color ?? C.cyan}` : "none",
                margin: "0 -24px",
                padding: "0 24px",
              }}
            >
              {plain ? l || " " : l.startsWith("#'") ? <span style={{ color: C.subtle }}>{l}</span> : highlightR(l) }
              {!l && " "}
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

/** Package file tree that assembles itself. */
export const Tree: React.FC<{ entries: { name: string; depth: number; dir?: boolean; at: number; note?: string; color?: string; dim?: boolean }[]; fontSize?: number }> = ({
  entries,
  fontSize = 30,
}) => {
  const t = useSec();
  return (
    <Panel style={{ padding: "22px 30px" }}>
      <div style={{ fontFamily: FONT.mono, fontSize, lineHeight: 1.75 }}>
        {entries.map((e) => {
          const p = ease(t, e.at, 0.45);
          return (
            <div key={e.name + e.depth} style={{ opacity: p * (e.dim ? 0.45 : 1), transform: `translateX(${(1 - p) * -16}px)`, paddingLeft: e.depth * 38, display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ width: 16, height: 16, borderRadius: e.dir ? 4 : 99, background: e.dir ? (e.color ?? C.violet) : "transparent", border: e.dir ? "none" : `2px solid ${e.color ?? C.cyan}` }} />
              <span style={{ color: e.dir ? C.text : (e.color ?? C.text) }}>{e.name}</span>
              {e.note && <span style={{ fontFamily: FONT.sans, fontSize: fontSize * 0.72, color: C.subtle }}>{e.note}</span>}
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

export const Console: React.FC<{ lines: { text: string; color?: string; at: number }[]; title?: string; fontSize?: number; style?: React.CSSProperties }> = ({
  lines,
  title = "Terminal",
  fontSize = 23,
  style,
}) => {
  const t = useSec();
  const first = Math.min(...lines.map((l) => l.at));
  return (
    <Panel title={title} style={{ opacity: ease(t, first - 0.4, 0.4), ...style }}>
      <div style={{ padding: "16px 24px", fontFamily: FONT.mono, fontSize, lineHeight: 1.55, background: "#060910" }}>
        {lines.map((l, i) => (
          <div key={i} style={{ whiteSpace: "pre", color: l.color ?? C.muted, opacity: ease(t, l.at, 0.3) }}>
            {l.text}
          </div>
        ))}
      </div>
    </Panel>
  );
};

