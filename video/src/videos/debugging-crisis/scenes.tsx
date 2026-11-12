import React from "react";
import { AbsoluteFill } from "remotion";
import { Console, File, Tree } from "../../blocks";
import { Appear, C, Chip, Code, ease, FONT, Frame, Heading, LogoMark, Panel, useBeats, useSec, useSpring } from "../../kit";

/*
 * Video 3: Debugging R Environments.
 * All console output was produced with R 4.6.1, dplyr 1.2.1, and MASS (attached after dplyr).
 */

const A = C.coral;
const Row: React.FC<{ children: React.ReactNode; gap?: number; style?: React.CSSProperties }> = ({ children, gap = 44, style }) => (
  <div style={{ display: "flex", gap, alignItems: "flex-start", ...style }}>{children}</div>
);
const H: React.FC<{ n: number; title: string }> = ({ n, title }) => <Heading kicker={`Chapter ${n}`} title={title} color={A} />;

export const Intro: React.FC = () => {
  const t = useSec();
  const s = useSpring(0.2);
  return (
    <AbsoluteFill style={{ background: C.bg, display: "grid", placeItems: "center" }}>
      <AbsoluteFill style={{ background: "radial-gradient(50% 45% at 50% 45%, rgba(251,113,133,0.22), transparent 70%)" }} />
      <div style={{ textAlign: "center", transform: `scale(${0.9 + 0.1 * s})`, opacity: s }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LogoMark size={120} />
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 26, letterSpacing: "0.22em", color: A, marginTop: 34, opacity: ease(t, 0.6) }}>WORLD 3 · DEBUGGING CRISIS</div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 84, color: C.text, letterSpacing: "-0.02em", marginTop: 14, opacity: ease(t, 0.9) }}>
          When R Works on One Machine Only
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const D01: React.FC = () => {
  const b = useBeats("d01");
  return (
    <Frame chapter="It worked yesterday">
      <H n={1} title="Same code. Different session." />
      <Row style={{ marginTop: 54 }} gap={36}>
        <Appear at={b[0] + 0.3} style={{ flex: 1 }}>
          <Console
            title="Yesterday · your laptop"
            fontSize={24}
            lines={[
              { text: "> source(\"report.R\")", color: C.text, at: b[0] + 0.5 },
              { text: "Placebo   10.39 (0.58)", at: b[0] + 1.2 },
              { text: "Treatment 13.16 (0.90)", at: b[0] + 1.5 },
              { text: "✓ report written", color: C.emerald, at: b[0] + 2 },
            ]}
          />
        </Appear>
        <Appear at={b[1]} style={{ flex: 1 }}>
          <Console
            title="Tonight · scheduled job"
            fontSize={24}
            lines={[
              { text: "> source(\"report.R\")", color: C.text, at: b[1] + 0.2 },
              { text: "Error in file(file, \"rt\") :", color: C.coral, at: b[1] + 0.8 },
              { text: "  cannot open the connection", color: C.coral, at: b[1] + 0.8 },
              { text: "✗ no report", color: C.coral, at: b[1] + 1.4 },
            ]}
          />
        </Appear>
      </Row>
      <Row gap={18} style={{ marginTop: 44 }}>
        {["attached packages", "free variables", "working directory", "global options"].map((x, i) => (
          <Appear key={x} at={b[4] + i * 0.6}>
            <Chip color={[A, C.gold, C.cyan, C.violet][i]}>{x}</Chip>
          </Appear>
        ))}
      </Row>
      <Appear at={b[3]} style={{ marginTop: 30, fontSize: 32, color: C.muted }}>
        Nothing in the code changed. <span style={{ color: C.text }}>Something in the environment did.</span>
      </Appear>
    </Frame>
  );
};

const PATH = [".GlobalEnv", "package:MASS", "package:dplyr", "package:stats", "package:graphics", "…", "package:base"];

export const D02: React.FC = () => {
  const b = useBeats("d02");
  const t = useSec();
  const scan = Math.min(1, Math.max(0, (t - (b[1] + 0.6)) / 1.6)); // scanner reaches MASS
  return (
    <Frame chapter="The search path">
      <H n={2} title="R finds names along the search path" />
      <Row style={{ marginTop: 50 }} gap={60}>
        <div style={{ width: 620, position: "relative" }}>
          {PATH.map((p, i) => {
            const isMass = i === 1;
            const lit = isMass && scan >= 1;
            return (
              <Appear key={p} at={b[0] + 0.4 + i * 0.25} dy={10}>
                <div
                  style={{
                    marginBottom: 12,
                    padding: "14px 22px",
                    borderRadius: 14,
                    border: `2px solid ${lit ? A : C.line}`,
                    background: lit ? "rgba(251,113,133,0.10)" : C.panel,
                    fontFamily: FONT.mono,
                    fontSize: 28,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{p}</span>
                  {(i === 1 || i === 2) && <span style={{ color: lit || i === 2 ? C.subtle : C.subtle, fontSize: 22 }}>select()</span>}
                </div>
              </Appear>
            );
          })}
          <div
            style={{
              position: "absolute",
              left: -40,
              top: 18 + scan * 70,
              fontSize: 34,
              color: A,
              opacity: ease(t, b[1] + 0.4),
            }}
          >
            ▶
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <Appear at={b[1]}>
            <Chip color={A}>MASS attached after dplyr → MASS::select() wins</Chip>
          </Appear>
          <div style={{ marginTop: 30 }}>
            <Console
              title="R (real output)"
              fontSize={25}
              lines={[
                { text: "> trial |> select(arm, outcome)", color: C.text, at: b[2] + 1.2 },
                { text: "Error in select(trial, arm, outcome) :", color: C.coral, at: b[2] + 1.9 },
                { text: "  unused arguments (arm, outcome)", color: C.coral, at: b[2] + 1.9 },
              ]}
            />
          </div>
        </div>
      </Row>
    </Frame>
  );
};

export const D03: React.FC = () => {
  const b = useBeats("d03");
  return (
    <Frame chapter="The search path">
      <H n={2} title="Diagnose before you guess" />
      <div style={{ marginTop: 50, width: 1300 }}>
        <Code
          title="console (real output)"
          fontSize={29}
          lines={[
            { code: "head(search(), 4)", at: b[1], out: '[1] ".GlobalEnv"    "package:MASS"  "package:dplyr" "package:stats"' },
            { code: "environment(select)", at: b[2], out: "<environment: namespace:MASS>", outColor: C.coral },
            { code: 'intersect(conflicts(detail = TRUE)[["package:MASS"]],', at: b[3] },
            { code: '          conflicts(detail = TRUE)[["package:dplyr"]])', at: b[3] + 1.4, out: '[1] "select"', outColor: C.coral },
          ]}
        />
      </div>
      <Appear at={b[4]} style={{ marginTop: 30 }}>
        <Chip color={A}>select() lives in two places, and MASS is in front</Chip>
      </Appear>
    </Frame>
  );
};

export const D04: React.FC = () => {
  const b = useBeats("d04");
  return (
    <Frame chapter="Qualified calls">
      <H n={3} title="Stop depending on the order" />
      <Row style={{ marginTop: 50 }} gap={40}>
        <div style={{ width: 1000 }}>
          <File
            name="baseline_table.R"
            at={b[1]}
            fontSize={28}
            lines={["baseline_table <- function(df) {", "  df |>", "    dplyr::select(id, arm, baseline) |>", "    dplyr::filter(baseline > 0)", "}"]}
            highlight={[{ lines: [2, 3], from: b[1] + 1, color: C.emerald }]}
          />
          <Appear at={b[2]} style={{ marginTop: 26 }}>
            <Chip color={C.emerald}>works whatever is attached, even with dplyr not attached</Chip>
          </Appear>
        </div>
        <Appear at={b[3]} style={{ flex: 1 }}>
          <Panel style={{ padding: "24px 28px", borderColor: "rgba(251,191,36,0.45)" }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.gold, letterSpacing: "0.1em" }}>WITHOUT dplyr ATTACHED</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 28, marginTop: 14 }}>filter(x, ...)</div>
            <div style={{ fontSize: 40, color: C.subtle, margin: "6px 0" }}>↓</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 28, color: C.gold }}>stats::filter()</div>
            <div style={{ fontSize: 24, color: C.muted, marginTop: 12 }}>a time-series filter, not row filtering</div>
          </Panel>
        </Appear>
      </Row>
    </Frame>
  );
};

export const D05: React.FC = () => {
  const b = useBeats("d05");
  const t = useSec();
  return (
    <Frame chapter="Lexical scoping">
      <H n={4} title="Free variables leak in from outside" />
      <Row style={{ marginTop: 50 }} gap={50}>
        <div style={{ width: 1000 }}>
          <Code
            title="console (real output)"
            fontSize={29}
            lines={[
              { code: "threshold <- 0.05", at: b[0] + 0.4 },
              { code: "flag_signals <- function(p_values, alpha) {", at: b[2] },
              { code: "  p_values < threshold", at: b[2] + 1.2 },
              { code: "}", at: b[2] + 2 },
              { code: "flag_signals(c(0.01, 0.04, 0.2), alpha = 0.025)", at: b[2] + 3, out: "[1]  TRUE  TRUE FALSE", outColor: C.coral },
            ]}
            highlight={[{ lines: [2], from: b[2] + 1.6, color: A }]}
          />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, opacity: ease(t, b[1]) }}>
          <Panel style={{ padding: "18px 22px" }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.subtle }}>function environment</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 26 }}>p_values, alpha</div>
          </Panel>
          <div style={{ textAlign: "center", fontSize: 32, color: A }}>↓ threshold?</div>
          <Panel style={{ padding: "18px 22px", borderColor: "rgba(251,113,133,0.5)" }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.subtle }}>global environment</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 26, color: A }}>threshold = 0.05</div>
          </Panel>
          <Appear at={b[2] + 4}>
            <div style={{ fontSize: 24, color: C.muted }}>alpha = 0.025 was ignored: 0.04 is flagged.</div>
          </Appear>
        </div>
      </Row>
    </Frame>
  );
};

export const D06: React.FC = () => {
  const b = useBeats("d06");
  return (
    <Frame chapter="Pure functions">
      <H n={5} title="Make it pure" />
      <div style={{ marginTop: 44, width: 1500 }}>
        <Code
          title="console (real output)"
          fontSize={28}
          lines={[
            { code: "codetools::findGlobals(flag_signals, merge = FALSE)$variables", at: b[1], out: '[1] "threshold"', outColor: C.coral },
            { code: "flag_signals <- function(p_values, alpha = 0.05) p_values < alpha", at: b[2] },
            { code: "flag_signals(c(0.01, 0.04, 0.2), alpha = 0.025)", at: b[3], out: "[1]  TRUE FALSE FALSE", outColor: C.emerald },
            { code: "codetools::findGlobals(flag_signals, merge = FALSE)$variables", at: b[3] + 0.9, out: "character(0)", outColor: C.emerald },
          ]}
          highlight={[{ lines: [1], from: b[2] + 1, color: C.emerald }]}
        />
      </div>
      <Row gap={18} style={{ marginTop: 30 }}>
        <Appear at={b[2] + 1.5}>
          <Chip color={C.emerald}>everything arrives through arguments</Chip>
        </Appear>
        <Appear at={b[3] + 2.8}>
          <Chip color={C.emerald}>no free variables left</Chip>
        </Appear>
      </Row>
    </Frame>
  );
};

export const D07: React.FC = () => {
  const b = useBeats("d07");
  return (
    <Frame chapter="The working directory">
      <H n={6} title="Relative paths depend on where you are" />
      <Row style={{ marginTop: 44 }} gap={30}>
        <div style={{ width: 460 }}>
          <Tree fontSize={26} entries={[{ name: "~/project/", depth: 0, dir: true, at: b[1], color: C.emerald, note: "your laptop" }, { name: "visits.csv", depth: 1, at: b[1] + 0.5, color: C.emerald }, { name: "report.R", depth: 1, at: b[1] + 0.8 }]} />
          <div style={{ height: 20 }} />
          <Tree fontSize={26} entries={[{ name: "/srv/jobs/", depth: 0, dir: true, at: b[1] + 1.6, color: A, note: "scheduled job" }, { name: "(no visits.csv)", depth: 1, at: b[1] + 2.1, color: C.subtle }]} />
        </div>
        <div style={{ flex: 1 }}>
          <Console
            title="R (real output)"
            fontSize={23}
            lines={[
              { text: '> read.csv("visits.csv")', color: C.text, at: b[1] + 2.6 },
              { text: 'Error in file(file, "rt") : cannot open the connection', color: C.coral, at: b[1] + 3.2 },
              { text: "In addition: Warning message:", color: C.muted, at: b[1] + 3.4 },
              { text: "  cannot open file 'visits.csv': No such file or directory", color: C.muted, at: b[1] + 3.4 },
            ]}
          />
          <div style={{ marginTop: 26 }}>
            <File name="report.R (fixed)" at={b[2]} fontSize={26} lines={["run_report <- function(data_dir) {", '  path <- file.path(data_dir, "visits.csv")', "  d <- utils::read.csv(path)", "  ...", "}"]} highlight={[{ lines: [1], from: b[2] + 0.8, color: C.emerald }]} />
          </div>
        </div>
      </Row>
    </Frame>
  );
};

export const D08: React.FC = () => {
  const b = useBeats("d08");
  return (
    <Frame chapter="Global options">
      <H n={7} title="Options change output" />
      <div style={{ marginTop: 44, width: 1300 }}>
        <Code
          title="console (real output)"
          fontSize={30}
          lines={[
            { code: "x <- 10.3875", at: b[0] + 0.4 },
            { code: "format(round(x, 2), nsmall = 2)", at: b[0] + 1.2, out: '[1] "10.39"' },
            { code: 'options(OutDec = ",")', at: b[1] },
            { code: "format(round(x, 2), nsmall = 2)", at: b[1] + 1.4, out: '[1] "10,39"', outColor: C.coral },
            { code: 'sprintf("%.2f", x)', at: b[2], out: '[1] "10.39"', outColor: C.emerald },
          ]}
          highlight={[{ lines: [3], from: b[1] + 2, to: b[2], color: A }, { lines: [4], from: b[2] + 0.6, color: C.emerald }]}
        />
      </div>
      <Appear at={b[3]} style={{ marginTop: 30 }}>
        <Chip color={C.emerald}>Report numbers shouldn't depend on the session</Chip>
      </Appear>
    </Frame>
  );
};

export const D09: React.FC = () => {
  const b = useBeats("d09");
  return (
    <Frame chapter="Restoring state">
      <H n={8} title="Leave the session as you found it" />
      <Row style={{ marginTop: 50 }} gap={40}>
        <div style={{ width: 1050 }}>
          <Code
            title="console (real output)"
            fontSize={28}
            lines={[
              { code: "f <- function() {", at: b[1] },
              { code: "  old <- options(digits = 3)", at: b[1] + 0.8 },
              { code: "  on.exit(options(old))", at: b[1] + 1.8 },
              { code: "  format(pi)", at: b[1] + 2.8 },
              { code: "}", at: b[1] + 3.3 },
              { code: "f()", at: b[2], out: '[1] "3.14"' },
              { code: 'getOption("digits")', at: b[2] + 1.4, out: "[1] 7", outColor: C.emerald },
            ]}
            highlight={[{ lines: [2], from: b[1] + 2.2, color: C.emerald }]}
          />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          <Appear at={b[1] + 2.4}>
            <Chip color={C.emerald}>on.exit() runs however f() ends, even after an error</Chip>
          </Appear>
          <Appear at={b[2] + 2.4}>
            <Chip color={C.cyan}>withr::local_options() does the same</Chip>
          </Appear>
        </div>
      </Row>
    </Frame>
  );
};

export const D10: React.FC = () => {
  const b = useBeats("d10");
  const rows = [
    { k: "r_version", v: '"R version 4.6.1 (2026-06-24)"', at: b[1] },
    { k: "packages", v: 'c(dplyr = "1.2.1")', at: b[1] + 1.4 },
    { k: "input_md5", v: '"083167e53e63c12447ba42c328abe046"', at: b[1] + 2.8 },
  ];
  return (
    <Frame chapter="Provenance">
      <H n={9} title="Record what the result ran on" />
      <Row style={{ marginTop: 50 }} gap={40}>
        <div style={{ width: 1100 }}>
          <Panel title="run_report(data_dir)$session" style={{ padding: 0 }}>
            <div style={{ padding: "20px 28px", fontFamily: FONT.mono, fontSize: 28, lineHeight: 1.8 }}>
              {rows.map((r) => (
                <Appear key={r.k} at={r.at} dy={8}>
                  <div>
                    <span style={{ color: C.cyan }}>{r.k}</span> <span style={{ color: C.subtle }}>=</span> <span style={{ color: C.emerald }}>{r.v}</span>
                  </div>
                </Appear>
              ))}
            </div>
          </Panel>
          <Appear at={b[1] + 4} style={{ marginTop: 20, fontSize: 24, color: C.muted }}>
            from R.version.string, utils::packageVersion(), and tools::md5sum()
          </Appear>
        </div>
        <Appear at={b[2]} style={{ flex: 1 }}>
          <Panel style={{ padding: "24px 28px", borderColor: "rgba(52,211,153,0.4)" }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.emerald, letterSpacing: "0.1em" }}>ON YOUR MACHINE</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 30, marginTop: 12 }}>renv.lock</div>
            <div style={{ fontSize: 24, color: C.muted, marginTop: 10 }}>pins the exact version of every package the project uses</div>
          </Panel>
        </Appear>
      </Row>
    </Frame>
  );
};

export const D11: React.FC = () => {
  const b = useBeats("d11");
  const missions = [
    { title: "The masked select", xp: 70, detail: "Make outcome_table() immune to attach order", at: b[1] },
    { title: "Lexical scoping surprise", xp: 70, detail: "A pure flag_signals() with alpha = 0.05", at: b[2] },
    { title: "Boss: Works On My Machine", xp: 220, detail: "Same report from any directory, any options, with or without dplyr, and provenance", at: b[3] },
  ];
  return (
    <Frame chapter="Your Debugging Crisis missions">
      <Heading kicker="Missions" title="Your Debugging Crisis missions" color={A} />
      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 50 }}>
        {missions.map((m, i) => (
          <Appear key={m.title} at={m.at}>
            <Panel style={{ padding: "24px 32px", display: "flex", alignItems: "center", gap: 30, borderColor: i === 2 ? "rgba(251,113,133,0.55)" : C.line }}>
              <div style={{ fontFamily: FONT.display, fontSize: 44, fontWeight: 700, color: A, width: 60 }}>{i + 1}</div>
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
      <AbsoluteFill style={{ background: "radial-gradient(50% 45% at 50% 50%, rgba(251,113,133,0.16), transparent 70%)" }} />
      <div style={{ textAlign: "center", opacity: ease(t, 0.1, 0.8) }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LogoMark size={96} />
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 64, marginTop: 26 }}>
          Next: <span style={{ color: A }}>The masked select</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontSize: 28, color: C.subtle, marginTop: 20 }}>RQuest · Research Programmer Academy · all data synthetic · independent project</div>
      </div>
    </AbsoluteFill>
  );
};
