import React from "react";
import { AbsoluteFill } from "remotion";
import { Appear, C, Chip, Code, ease, FONT, Frame, Heading, highlightR, LogoMark, Panel, useBeats, useSec, useSpring } from "../../kit";

/*
 * Video 2: From R Scripts to Research-Ready Packages.
 * Every file and console output shown here comes from a real labtools package built with
 * R 4.6.1, roxygen2 8.1.1, and testthat 3.3.2 (R CMD check: Status: OK).
 */

const V = C.violet;
const Row: React.FC<{ children: React.ReactNode; gap?: number; style?: React.CSSProperties }> = ({ children, gap = 48, style }) => (
  <div style={{ display: "flex", gap, alignItems: "flex-start", ...style }}>{children}</div>
);
const H: React.FC<{ n: number; title: string }> = ({ n, title }) => <Heading kicker={`Chapter ${n}`} title={title} color={V} />;

/** A file shown as a panel with R/Rd/DESCRIPTION-aware colouring; lines can be revealed and highlighted. */
const File: React.FC<{
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
const Tree: React.FC<{ entries: { name: string; depth: number; dir?: boolean; at: number; note?: string; color?: string; dim?: boolean }[]; fontSize?: number }> = ({
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
              <span style={{ width: 16, height: 16, borderRadius: e.dir ? 4 : 99, background: e.dir ? (e.color ?? V) : "transparent", border: e.dir ? "none" : `2px solid ${e.color ?? C.cyan}` }} />
              <span style={{ color: e.dir ? C.text : (e.color ?? C.text) }}>{e.name}</span>
              {e.note && <span style={{ fontFamily: FONT.sans, fontSize: fontSize * 0.72, color: C.subtle }}>{e.note}</span>}
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

const Console: React.FC<{ lines: { text: string; color?: string; at: number }[]; title?: string; fontSize?: number; style?: React.CSSProperties }> = ({
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

/* ------------------------------------------------------------------ */

export const Intro: React.FC = () => {
  const t = useSec();
  const s = useSpring(0.2);
  return (
    <AbsoluteFill style={{ background: C.bg, display: "grid", placeItems: "center" }}>
      <AbsoluteFill style={{ background: "radial-gradient(50% 45% at 50% 45%, rgba(139,92,246,0.25), transparent 70%)" }} />
      <div style={{ textAlign: "center", transform: `scale(${0.9 + 0.1 * s})`, opacity: s }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LogoMark size={120} />
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 26, letterSpacing: "0.22em", color: V, marginTop: 34, opacity: ease(t, 0.6) }}>
          WORLD 2 · PACKAGE FACTORY
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 80, color: C.text, letterSpacing: "-0.02em", marginTop: 14, opacity: ease(t, 0.9) }}>
          From R Scripts to Research-Ready Packages
        </div>
      </div>
    </AbsoluteFill>
  );
};

const COPIES = ["clean_sites.R", "clean_sites_v2.R", "clean_FINAL.R", "clean_final2.R", "clean_jan.R", "helpers.R", "clean (copy).R", "sites_fix.R", "clean_sites_old.R", "utils_mk.R", "clean_v3.R", "site_codes.R", "clean_new.R", "cleaning.R", "clean_ok.R"];

export const P01: React.FC = () => {
  const b = useBeats("p01");
  const t = useSec();
  const collapsed = t >= b[2];
  return (
    <Frame chapter="Why packages">
      <H n={1} title="Fifteen copies, one truth?" />
      {!collapsed ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginTop: 56 }}>
          {COPIES.map((c, i) => (
            <Appear key={c} at={b[0] + 0.3 + i * 0.12} dy={10}>
              <Panel style={{ padding: "16px 18px", borderColor: i % 4 === 1 && t >= b[1] ? "rgba(251,113,133,0.55)" : C.line }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.text }}>{c}</div>
                <div style={{ fontSize: 18, color: i % 4 === 1 && t >= b[1] ? C.coral : C.subtle, marginTop: 6 }}>
                  {i % 4 === 1 && t >= b[1] ? "≠ results" : "clean_site()"}
                </div>
              </Panel>
            </Appear>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 50 }}>
          <Appear at={b[2]}>
            <Panel style={{ padding: "34px 60px", borderColor: "rgba(167,139,250,0.6)", textAlign: "center" }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 24, color: V, letterSpacing: "0.14em" }}>ONE PACKAGE</div>
              <div style={{ fontFamily: FONT.display, fontSize: 72, fontWeight: 700, marginTop: 6 }}>labtools 0.1.0</div>
            </Panel>
          </Appear>
          <Row gap={18} style={{ marginTop: 34 }}>
            {["one home", "one version", "documentation", "tests"].map((x, i) => (
              <Appear key={x} at={b[3] + i * 0.5}>
                <Chip color={[V, C.cyan, C.gold, C.emerald][i]}>{x}</Chip>
              </Appear>
            ))}
          </Row>
          <div style={{ marginTop: 34, width: 900 }}>
            <Code lines={[{ code: 'packageVersion("labtools")', at: b[4], out: "[1] ‘0.1.0’" }]} title="analysis.R" fontSize={28} />
          </div>
        </div>
      )}
    </Frame>
  );
};

const DESCRIPTION = [
  "Package: labtools",
  "Title: Cleaning and Summary Helpers for Synthetic Lab Data",
  "Version: 0.1.0",
  'Authors@R: person("Demo", "Learner", role = c("aut", "cre"), ...)',
  "License: MIT + file LICENSE",
  "Imports: dplyr, rlang",
  "Suggests: testthat (>= 3.0.0)",
];

export const P02: React.FC = () => {
  const b = useBeats("p02");
  return (
    <Frame chapter="Package anatomy">
      <H n={2} title="A package is a folder with a fixed shape" />
      <Row style={{ marginTop: 50 }} gap={50}>
        <div style={{ width: 620 }}>
          <Tree
            entries={[
              { name: "labtools/", depth: 0, dir: true, at: b[0] + 0.3 },
              { name: "DESCRIPTION", depth: 1, at: b[1], color: C.gold, note: "metadata" },
              { name: "R/", depth: 1, dir: true, at: b[2], color: C.cyan, note: "your functions" },
              { name: "clean_site.R", depth: 2, at: b[3] + 1.2 },
              { name: "summarise_arm.R", depth: 2, at: b[3] + 2 },
            ]}
          />
        </div>
        <div style={{ flex: 1 }}>
          <File
            name="DESCRIPTION"
            plain
            at={b[1] + 0.4}
            lines={DESCRIPTION}
            fontSize={25}
            highlight={[
              { lines: [0], from: b[1] + 1.6, to: b[1] + 2.6, color: C.gold },
              { lines: [2], from: b[1] + 2.6, to: b[1] + 3.6, color: C.gold },
              { lines: [3], from: b[1] + 3.6, to: b[1] + 4.6, color: C.gold },
              { lines: [4], from: b[1] + 4.6, to: b[1] + 5.6, color: C.gold },
              { lines: [5, 6], from: b[1] + 5.6, to: b[2] + 1, color: C.gold },
            ]}
          />
        </div>
      </Row>
    </Frame>
  );
};

export const P03: React.FC = () => {
  const b = useBeats("p03");
  return (
    <Frame chapter="Package anatomy">
      <H n={2} title="Organize R/ by topic. Define functions only." />
      <Row style={{ marginTop: 50 }} gap={50}>
        <div style={{ width: 620 }}>
          <Tree
            entries={[
              { name: "R/", depth: 0, dir: true, at: b[0] + 0.2, color: C.cyan },
              { name: "clean_site.R", depth: 1, at: b[0] + 1.2, note: "site codes" },
              { name: "summarise_arm.R", depth: 1, at: b[0] + 2.0, note: "summaries" },
              { name: "utils.R", depth: 1, at: b[0] + 3.4, color: C.subtle, note: "internal helpers" },
            ]}
          />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          <Appear at={b[1]}>
            <File
              name="R/utils.R  ✓"
              at={b[1] + 0.2}
              lines={["# Internal helper: not exported, no Rd file.", ".normalise <- function(x) {", "  x <- toupper(trimws(x))", '  sub("^([A-Z]+)-?([0-9]+)$", "\\\\1-\\\\2", x)', "}"]}
              style={{ borderColor: "rgba(52,211,153,0.45)" }}
            />
          </Appear>
          <Appear at={b[2]}>
            <Panel title="R/clean_site.R  ✗ top-level code" style={{ borderColor: "rgba(251,113,133,0.5)" }}>
              <div style={{ padding: "16px 24px", fontFamily: FONT.mono, fontSize: 24, lineHeight: 1.6, color: C.coral }}>
                <div>library(dplyr)</div>
                <div>raw &lt;- read.csv("export.csv")</div>
                <div style={{ fontFamily: FONT.sans, fontSize: 22, color: C.muted, marginTop: 10 }}>Runs every time the package is built. Declare dependencies instead.</div>
              </div>
            </Panel>
          </Appear>
        </div>
      </Row>
    </Frame>
  );
};

export const P04: React.FC = () => {
  const b = useBeats("p04");
  const t = useSec();
  const call = ease(t, b[4] + 0.6, 1.2);
  return (
    <Frame chapter="Exports and the NAMESPACE">
      <H n={3} title="The NAMESPACE is the public interface" />
      <div style={{ position: "relative", marginTop: 60, height: 560 }}>
        <Appear at={b[1]} style={{ position: "absolute", left: 0, top: 120, width: 300 }}>
          <Panel style={{ padding: "26px", textAlign: "center" }}>
            <div style={{ fontSize: 26, color: C.muted }}>Users</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 26, marginTop: 10 }}>library(labtools)</div>
          </Panel>
        </Appear>
        <Appear at={b[0] + 0.3} style={{ position: "absolute", left: 420, top: 0, width: 1340, height: 520 }}>
          <div style={{ border: `2px solid ${V}`, borderRadius: 26, height: "100%", position: "relative", background: "rgba(167,139,250,0.04)" }}>
            <div style={{ position: "absolute", top: -18, left: 30, background: C.bg, padding: "0 14px", fontFamily: FONT.mono, fontSize: 24, color: V }}>labtools namespace</div>
            <div style={{ position: "absolute", left: 50, top: 70, width: 520, opacity: ease(t, b[1] + 0.6) }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.emerald, letterSpacing: "0.12em" }}>EXPORTED</div>
              {["clean_site()", "summarise_arm()"].map((f, i) => (
                <div key={f} style={{ marginTop: 16, padding: "16px 22px", borderRadius: 16, border: `2px solid ${C.emerald}`, fontFamily: FONT.mono, fontSize: 32, opacity: ease(t, b[3] + i * 0.6) }}>
                  {f}
                </div>
              ))}
            </div>
            <div style={{ position: "absolute", right: 60, top: 70, width: 520, opacity: ease(t, b[2]) }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.subtle, letterSpacing: "0.12em" }}>INTERNAL — free to change</div>
              <div style={{ marginTop: 16, padding: "16px 22px", borderRadius: 16, border: `2px dashed ${C.subtle}`, fontFamily: FONT.mono, fontSize: 32, color: C.muted, opacity: ease(t, b[3] + 1.2) }}>
                .normalise()
              </div>
            </div>
            <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
              <line x1="0" y1="200" x2="50" y2="200" stroke={C.emerald} strokeWidth="4" opacity={ease(t, b[4])} />
              <path d="M 560 190 C 650 190, 680 190, 760 190" stroke={C.cyan} strokeWidth="4" fill="none" strokeDasharray="220" strokeDashoffset={220 * (1 - call)} />
            </svg>
            <div style={{ position: "absolute", left: 590, top: 210, fontFamily: FONT.sans, fontSize: 22, color: C.cyan, opacity: call }}>calls</div>
          </div>
        </Appear>
      </div>
    </Frame>
  );
};

export const P05: React.FC = () => {
  const b = useBeats("p05");
  return (
    <Frame chapter="Exports and the NAMESPACE">
      <H n={3} title="Tag it. roxygen2 writes the NAMESPACE." />
      <Row style={{ marginTop: 50 }} gap={40}>
        <div style={{ width: 860 }}>
          <File
            name="R/clean_site.R"
            at={b[0] + 0.4}
            lines={["#' Standardise site codes", "#'", "#' @param x Character vector of raw site codes.", "#' @return Character vector of codes ...", "#' @export", "clean_site <- function(x) {", "  .normalise(x)", "}"]}
            highlight={[{ lines: [4], from: b[1], color: C.emerald }]}
          />
        </div>
        <Appear at={b[1] + 1.4} style={{ alignSelf: "center", fontSize: 54, color: C.subtle }}>→</Appear>
        <div style={{ flex: 1 }}>
          <File
            name="NAMESPACE  (generated)"
            plain
            at={b[1] + 1.8}
            lines={["# Generated by roxygen2: do not edit by hand", "", "export(clean_site)", "export(summarise_arm)", "importFrom(dplyr,", "  group_by,", "  summarise", ")", "importFrom(rlang,.data)", "importFrom(stats,sd)"]}
            highlight={[{ lines: [2], from: b[1] + 2.4, color: C.emerald }, { lines: [0], from: b[0], to: b[1] }]}
            fontSize={26}
          />
          <Appear at={b[2]} style={{ marginTop: 26 }}>
            <Chip color={V}>Every export is a promise you'll have to keep</Chip>
          </Appear>
        </div>
      </Row>
    </Frame>
  );
};

export const P06: React.FC = () => {
  const b = useBeats("p06");
  return (
    <Frame chapter="Documenting with roxygen2">
      <H n={4} title="Documentation lives next to the code" />
      <Row style={{ marginTop: 44 }} gap={36}>
        <div style={{ width: 900 }}>
          <File
            name="R/clean_site.R"
            at={b[0] + 0.3}
            fontSize={22}
            lines={["#' Standardise site codes", "#'", "#' @param x Character vector of raw site codes.", "#' @return Character vector of codes in the form `AAA-00`; `NA` is kept.", "#' @examples", "#' clean_site(c(\" bos01\", \"NYC-02\", NA))", "#' @export", "clean_site <- function(x) {", "  .normalise(x)", "}"]}
            highlight={[
              { lines: [0], from: b[1], to: b[2], color: C.gold },
              { lines: [2], from: b[2], to: b[2] + 2.2, color: C.gold },
              { lines: [3], from: b[2] + 2.2, to: b[2] + 4, color: C.gold },
              { lines: [4, 5], from: b[2] + 4, to: b[3], color: C.gold },
            ]}
          />
          <Appear at={b[3]} style={{ marginTop: 22 }}>
            <Code lines={[{ code: "devtools::document()", at: b[3] + 0.2, out: "Writing 'NAMESPACE'\nWriting 'clean_site.Rd'\nWriting 'summarise_arm.Rd'" }]} fontSize={24} title="console" />
          </Appear>
        </div>
        <div style={{ flex: 1 }}>
          <File
            name="man/clean_site.Rd  (generated)"
            plain
            at={b[3] + 1.2}
            stagger={0.08}
            fontSize={21}
            lines={["\\name{clean_site}", "\\title{Standardise site codes}", "\\usage{", "clean_site(x)", "}", "\\arguments{", "\\item{x}{Character vector of raw site codes.}", "}", "\\value{", "Character vector of codes in the form \\code{AAA-00}; ...", "}", "\\examples{", "clean_site(c(\" bos01\", \"NYC-02\", NA))", "}"]}
          />
        </div>
      </Row>
    </Frame>
  );
};

export const P07: React.FC = () => {
  const b = useBeats("p07");
  return (
    <Frame chapter="Documenting with roxygen2">
      <H n={4} title="Docs and code must agree" />
      <Row style={{ marginTop: 50 }} gap={40}>
        <div style={{ width: 960 }}>
          <File
            name="R/summarise_arm.R"
            at={b[0] + 0.3}
            fontSize={26}
            lines={["#' Mean and SD of outcome by treatment arm", "#'", "#' @param df A data frame with columns `arm` and `outcome`.", "#' @return A tibble with one row per arm.", "#' @export", "summarise_arm <- function(df, na_rm = TRUE) {", "  ...", "}"]}
            highlight={[{ lines: [5], from: b[1], to: b[3], color: C.coral }]}
          />
          <Appear at={b[3]} style={{ marginTop: 20 }}>
            <Panel style={{ padding: "14px 24px", borderColor: "rgba(52,211,153,0.5)" }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 23, color: C.emerald, whiteSpace: "pre" }}>
                {"+ #' @param na_rm Drop missing outcomes before summarising?"}
              </div>
            </Panel>
          </Appear>
        </div>
        <div style={{ flex: 1 }}>
          <Console
            title="R CMD check (real output)"
            fontSize={26}
            lines={[
              { text: "* checking Rd \\usage sections ... WARNING", color: C.gold, at: b[1] + 1.5 },
              { text: "Undocumented arguments in Rd file", color: C.text, at: b[1] + 2 },
              { text: "  'summarise_arm.Rd'", color: C.text, at: b[1] + 2 },
              { text: "  ‘na_rm’", color: C.coral, at: b[1] + 2.4 },
            ]}
          />
          <Appear at={b[2]} style={{ marginTop: 22 }}>
            <Chip color={C.coral}>A warning is a bug</Chip>
          </Appear>
        </div>
      </Row>
    </Frame>
  );
};

export const P08: React.FC = () => {
  const b = useBeats("p08");
  const t = useSec();
  const col = (x: number, at: number, title: string, color: string, lines: string[]) => (
    <div style={{ position: "absolute", left: x, top: 0, width: 520, opacity: ease(t, at) }}>
      <Panel title={title} style={{ borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}>
        <div style={{ padding: "16px 22px", fontFamily: FONT.mono, fontSize: 23, lineHeight: 1.6 }}>
          {lines.map((l) => (
            <div key={l} style={{ whiteSpace: "pre", color: C.text }}>{l}</div>
          ))}
        </div>
      </Panel>
    </div>
  );
  const link = (x1: number, x2: number, at: number, color: string) => {
    const p = ease(t, at, 1);
    return <line x1={x1} y1="120" x2={x1 + (x2 - x1) * p} y2="120" stroke={color} strokeWidth="4" markerEnd={p > 0.95 ? "url(#arrow)" : undefined} />;
  };
  return (
    <Frame chapter="Managing dependencies">
      <H n={5} title="Declared twice, for two reasons" />
      <div style={{ position: "relative", marginTop: 60, height: 420 }}>
        {col(0, b[1], "DESCRIPTION", C.gold, ["Imports: dplyr, rlang", "", "→ installed with", "  your package"])}
        {col(620, b[2], "NAMESPACE", V, ["importFrom(dplyr, group_by,", "           summarise)", "importFrom(rlang, .data)", "importFrom(stats, sd)"])}
        {col(1240, b[2] + 1.5, "R/summarise_arm.R", C.cyan, ["group_by(df, .data$arm)", "summarise(grouped,", "  mean = mean(...),", "  sd   = sd(...))"])}
        <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width="1760" height="300">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={C.subtle} />
            </marker>
          </defs>
          {link(520, 612, b[2] - 0.2, C.gold)}
          {link(1140, 1232, b[2] + 1.8, V)}
        </svg>
      </div>
      <Row gap={20} style={{ marginTop: 10 }}>
        <Appear at={b[3]}>
          <Chip color={V}>@importFrom dplyr group_by summarise</Chip>
        </Appear>
        <Appear at={b[3] + 2.4}>
          <Chip color={C.cyan}>or: dplyr::group_by()</Chip>
        </Appear>
      </Row>
    </Frame>
  );
};

export const P09: React.FC = () => {
  const b = useBeats("p09");
  return (
    <Frame chapter="Managing dependencies">
      <H n={5} title="Forget one, and the check tells you" />
      <Row style={{ marginTop: 44 }} gap={36}>
        <div style={{ width: 1000 }}>
          <Console
            title="R CMD check (real output)"
            fontSize={21}
            lines={[
              { text: "* checking R code for possible problems ... NOTE", color: C.gold, at: b[0] + 0.4 },
              { text: "summarise_arm: no visible global function definition for ‘group_by’", color: C.text, at: b[1] },
              { text: "summarise_arm: no visible binding for global variable ‘arm’", color: C.muted, at: b[1] + 0.3 },
              { text: "summarise_arm: no visible global function definition for ‘summarise’", color: C.text, at: b[1] + 0.6 },
              { text: "summarise_arm: no visible binding for global variable ‘outcome’", color: C.muted, at: b[1] + 0.9 },
              { text: "summarise_arm: no visible global function definition for ‘sd’", color: C.coral, at: b[2] },
              { text: "Consider adding", color: C.subtle, at: b[2] + 0.6 },
              { text: '  importFrom("stats", "sd")', color: C.emerald, at: b[2] + 0.6 },
            ]}
          />
        </div>
        <div style={{ flex: 1 }}>
          <File
            name="R/summarise_arm.R  (fixed)"
            at={b[3]}
            fontSize={21}
            stagger={0.08}
            lines={["#' @importFrom dplyr group_by summarise", "#' @importFrom rlang .data", "#' @importFrom stats sd", "#' @export", "summarise_arm <- function(df, na_rm = TRUE) {", "  grouped <- group_by(df, .data$arm)", "  summarise(grouped,", "    mean = mean(.data$outcome, na.rm = na_rm),", "    sd = sd(.data$outcome, na.rm = na_rm)", "  )", "}"]}
            highlight={[{ lines: [2], from: b[2], to: b[3] + 1, color: C.emerald }, { lines: [5, 7, 8], from: b[3] + 1.5, color: C.cyan }]}
          />
        </div>
      </Row>
    </Frame>
  );
};

export const P10: React.FC = () => {
  const b = useBeats("p10");
  return (
    <Frame chapter="Testing with testthat">
      <H n={6} title="Expectations, as code" />
      <Row style={{ marginTop: 44 }} gap={36}>
        <div style={{ width: 560 }}>
          <Tree
            fontSize={28}
            entries={[
              { name: "tests/", depth: 0, dir: true, at: b[1], color: C.emerald },
              { name: "testthat.R", depth: 1, at: b[1] + 0.6 },
              { name: "testthat/", depth: 1, dir: true, at: b[1] + 1.1, color: C.emerald },
              { name: "test-clean_site.R", depth: 2, at: b[1] + 1.6, color: C.emerald },
              { name: "test-summarise_arm.R", depth: 2, at: b[1] + 2.1, color: C.emerald },
            ]}
          />
          <Appear at={b[3]} style={{ marginTop: 24 }}>
            <Console
              title="devtools::test()"
              fontSize={22}
              lines={[
                { text: "ℹ Testing labtools", at: b[3] + 0.2 },
                { text: "clean_site: ..", color: C.emerald, at: b[3] + 0.8 },
                { text: "summarise_arm: .", color: C.emerald, at: b[3] + 1.2 },
                { text: "══ DONE ═══════════", color: C.text, at: b[3] + 1.6 },
              ]}
            />
          </Appear>
        </div>
        <div style={{ flex: 1 }}>
          <File
            name="tests/testthat/test-clean_site.R"
            at={b[2]}
            fontSize={25}
            stagger={0.1}
            lines={['test_that("clean_site standardises codes and keeps NA", {', '  expect_equal(clean_site(c(" bos01", "NYC-02", NA)),', '               c("BOS-01", "NYC-02", NA))', "})", "", 'test_that("clean_site handles empty input", {', "  expect_identical(clean_site(character(0)), character(0))", "})"]}
          />
        </div>
      </Row>
    </Frame>
  );
};

export const P11: React.FC = () => {
  const b = useBeats("p11");
  const t = useSec();
  const steps = [
    { label: "labtools/", sub: "source", color: C.violet, at: b[1] },
    { label: "R CMD build", sub: "", color: C.cyan, at: b[1] + 0.8, tool: true },
    { label: "labtools_0.1.0.tar.gz", sub: "bundle", color: C.gold, at: b[1] + 1.6 },
    { label: "R CMD check", sub: "", color: C.cyan, at: b[2], tool: true },
  ];
  return (
    <Frame chapter="Building and checking">
      <H n={7} title="Build, then check" />
      <Row gap={18} style={{ marginTop: 50, alignItems: "center" }}>
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <Appear at={s.at}>
              <div
                style={{
                  padding: "18px 26px",
                  borderRadius: s.tool ? 999 : 18,
                  border: `2px solid ${s.color}`,
                  fontFamily: FONT.mono,
                  fontSize: 27,
                  background: s.tool ? `color-mix(in srgb, ${s.color} 12%, transparent)` : C.panel,
                }}
              >
                {s.label}
                {s.sub && <span style={{ fontSize: 20, color: C.subtle, marginLeft: 12 }}>{s.sub}</span>}
              </div>
            </Appear>
            {i < steps.length - 1 && <div style={{ fontSize: 40, color: C.subtle, opacity: ease(t, s.at + 0.4) }}>→</div>}
          </React.Fragment>
        ))}
      </Row>
      <Row gap={36} style={{ marginTop: 40 }}>
        <div style={{ width: 1000 }}>
          <Console
            title="R CMD check labtools_0.1.0.tar.gz (real output, excerpt)"
            fontSize={25}
            lines={[
              { text: "* checking for missing documentation entries ... OK", at: b[2] + 1.2 },
              { text: "* checking for code/documentation mismatches ... OK", at: b[2] + 1.6 },
              { text: "* checking Rd \\usage sections ... OK", at: b[2] + 2.0 },
              { text: "* checking examples ... OK", at: b[2] + 2.6 },
              { text: "* checking tests ...", at: b[2] + 3.2 },
              { text: "  Running ‘testthat.R’ OK", at: b[2] + 3.6 },
              { text: "Status: OK", color: C.emerald, at: b[4] },
            ]}
          />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          <Appear at={b[3]}>
            <Chip color={C.cyan}>devtools::check() = the same steps, from R</Chip>
          </Appear>
          {["0 errors", "0 warnings", "0 notes"].map((x, i) => (
            <Appear key={x} at={b[4] + i * 0.5}>
              <Chip color={C.emerald}>✓ {x}</Chip>
            </Appear>
          ))}
        </div>
      </Row>
    </Frame>
  );
};

export const P12: React.FC = () => {
  const b = useBeats("p12");
  const box = (title: string, color: string, at: number, items: string[], foot: string) => (
    <Appear at={at} style={{ flex: 1 }}>
      <Panel style={{ padding: "26px 30px", borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: "0.12em", color }}>{title}</div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((x) => (
            <div key={x} style={{ fontSize: 27, color: C.text }}>
              <span style={{ color, marginRight: 12 }}>●</span>
              {x}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, fontSize: 22, color: C.subtle }}>{foot}</div>
      </Panel>
    </Appear>
  );
  return (
    <Frame chapter="Building and checking">
      <H n={7} title="An honest caveat" />
      <Row gap={36} style={{ marginTop: 56 }}>
        {box("IN RQUEST · YOUR BROWSER (webR)", C.cyan, b[2], ["roxygen2 builds NAMESPACE and man/", "tools::checkRd() on every help file", "examples are run", "imports audited for undefined globals"], "Approximates the checks. No shell, so no R CMD check.")}
        {box("ON YOUR MACHINE", C.emerald, b[3], ["R CMD check", "or devtools::check()", "installs, runs tests, full audit"], "Run before every release.")}
      </Row>
      <Appear at={b[1]} style={{ marginTop: 34 }}>
        <Chip color={C.gold}>R CMD check needs a full R installation with a shell</Chip>
      </Appear>
    </Frame>
  );
};

export const P13: React.FC = () => {
  const b = useBeats("p13");
  const t = useSec();
  const versions = [
    { v: "0.1.0", note: "first release", color: C.violet, at: b[0] + 0.4 },
    { v: "0.1.1", note: "patch: bug fix", color: C.cyan, at: b[1] + 1.4 },
    { v: "0.2.0", note: "minor: new feature", color: C.gold, at: b[1] + 2.8 },
    { v: "1.0.0", note: "major: may break code", color: C.coral, at: b[1] + 4.4 },
  ];
  return (
    <Frame chapter="Versions and collaboration">
      <H n={8} title="Version every release" />
      <div style={{ position: "relative", marginTop: 70, height: 170, display: "flex", justifyContent: "space-between", padding: "0 20px" }}>
        <div style={{ position: "absolute", left: 160, right: 160, top: 40, height: 4, background: C.lineStrong, transform: `scaleX(${ease(t, b[0], 1.5)})`, transformOrigin: "left" }} />
        {versions.map((v) => (
          <div key={v.v} style={{ position: "relative", opacity: ease(t, v.at), textAlign: "center", width: 300 }}>
            <div style={{ width: 84, height: 84, borderRadius: 99, border: `4px solid ${v.color}`, background: C.panel, display: "grid", placeItems: "center", margin: "0 auto", fontFamily: FONT.mono, fontSize: 22 }}>{v.v}</div>
            <div style={{ marginTop: 12, fontSize: 22, color: C.muted }}>{v.note}</div>
          </div>
        ))}
      </div>
      <Row gap={30} style={{ marginTop: 40 }}>
        <div style={{ flex: 1 }}>
          <File name="NEWS.md" plain at={b[2]} fontSize={25} lines={["# labtools 0.1.1", "", "* clean_site() keeps NA instead of the string \"NA\".", "", "# labtools 0.1.0", "", "* First release: clean_site(), summarise_arm()."]} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          <Console title="git" fontSize={22} lines={[{ text: "$ git tag v0.1.0", color: C.text, at: b[2] + 1.6 }, { text: "$ git push --tags", color: C.text, at: b[2] + 2.2 }]} />
          <Appear at={b[2] + 3.2}>
            <Code title="analysis.R" fontSize={23} lines={[{ code: 'packageVersion("labtools")', at: b[2] + 3.6, out: "[1] ‘0.1.0’" }]} />
          </Appear>
        </div>
      </Row>
    </Frame>
  );
};

export const P14: React.FC = () => {
  const b = useBeats("p14");
  const missions = [
    { title: "Export the right functions", xp: 60, detail: "NAMESPACE exports clean_site(); .normalise() stays internal; title, @param, @return", at: b[1] },
    { title: "Silence the check warnings", xp: 70, detail: "Document na_rm; import group_by, summarise, sd", at: b[2] },
    { title: "Boss: Ship labtools 0.1.0", xp: 200, detail: "Two exports, full docs, runnable examples, no undefined globals", at: b[3] },
  ];
  return (
    <Frame chapter="Your Package Factory missions">
      <Heading kicker="Missions" title="Your Package Factory missions" color={V} />
      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 50 }}>
        {missions.map((m, i) => (
          <Appear key={m.title} at={m.at}>
            <Panel style={{ padding: "24px 32px", borderColor: i === 2 ? "rgba(167,139,250,0.6)" : C.line, display: "flex", alignItems: "center", gap: 30 }}>
              <div style={{ fontFamily: FONT.display, fontSize: 44, fontWeight: 700, color: V, width: 60 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT.display, fontSize: 36, fontWeight: 700 }}>{m.title}</div>
                <div style={{ fontSize: 24, color: C.muted, marginTop: 6 }}>{m.detail}</div>
              </div>
              <Chip color={C.emerald}>{m.xp} XP</Chip>
            </Panel>
          </Appear>
        ))}
      </div>
    </Frame>
  );
};

export const Outro: React.FC = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: C.bg, display: "grid", placeItems: "center" }}>
      <AbsoluteFill style={{ background: "radial-gradient(50% 45% at 50% 50%, rgba(167,139,250,0.18), transparent 70%)" }} />
      <div style={{ textAlign: "center", opacity: ease(t, 0.1, 0.8) }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LogoMark size={96} />
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 64, marginTop: 26 }}>
          Next: <span style={{ color: V }}>Export the right functions</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontSize: 28, color: C.subtle, marginTop: 20 }}>
          RQuest · Research Programmer Academy · all data synthetic · independent project
        </div>
      </div>
    </AbsoluteFill>
  );
};
