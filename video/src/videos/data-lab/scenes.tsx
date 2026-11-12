import React from "react";
import { AbsoluteFill } from "remotion";
import { Appear, C, Cells, Chip, Code, ease, FONT, Frame, Heading, LogoMark, Panel, Table, useBeats, useSec, useSpring } from "../../kit";

/* All R outputs shown here were produced by running the code in R 4.6.1. */

const Row: React.FC<{ children: React.ReactNode; gap?: number; style?: React.CSSProperties }> = ({ children, gap = 48, style }) => (
  <div style={{ display: "flex", gap, alignItems: "flex-start", ...style }}>{children}</div>
);

const Note: React.FC<{ at: number; children: React.ReactNode; color?: string }> = ({ at, children, color = C.muted }) => (
  <Appear at={at} style={{ fontSize: 30, lineHeight: 1.45, color, maxWidth: 760 }}>
    {children}
  </Appear>
);

/* ------------------------------------------------------------------ */

export const Intro: React.FC = () => {
  const t = useSec();
  const s = useSpring(0.2);
  return (
    <AbsoluteFill style={{ background: C.bg, display: "grid", placeItems: "center" }}>
      <AbsoluteFill
        style={{ background: "radial-gradient(50% 45% at 50% 45%, rgba(139,92,246,0.22), transparent 70%)" }}
      />
      <div style={{ textAlign: "center", transform: `scale(${0.9 + 0.1 * s})`, opacity: s }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LogoMark size={120} />
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 26, letterSpacing: "0.22em", color: C.cyan, marginTop: 34, opacity: ease(t, 0.6) }}>
          WORLD 1 · THE DATA LAB
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 86, color: C.text, letterSpacing: "-0.02em", marginTop: 14, opacity: ease(t, 0.9) }}>
          Introduction to R
        </div>
        <div style={{ fontFamily: FONT.sans, fontSize: 36, color: C.muted, marginTop: 10, opacity: ease(t, 1.3) }}>
          for research programmers
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const S01: React.FC = () => {
  const b = useBeats("s01");
  const t = useSec();
  const chain = [
    { k: "THE FILE", v: "enrollment_export.csv", c: C.cyan },
    { k: "THE CODE", v: "clean_enrollment.R", c: C.violet },
    { k: "THE RUN", v: "Analyst · R 4.6.1", c: C.emerald },
  ];
  return (
    <Frame chapter="Why R for research">
      <Heading kicker="Chapter 1" title="Every number has a history" />
      <Row gap={30} style={{ marginTop: 70 }}>
        {chain.map((n, i) => (
          <React.Fragment key={n.k}>
            <Appear at={b[0] + 1.2 + i * 1.6} style={{ flex: 1 }}>
              <Panel style={{ padding: "28px 32px", borderColor: `color-mix(in srgb, ${n.c} 45%, transparent)` }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 20, letterSpacing: "0.16em", color: n.c }}>{n.k}</div>
                <div style={{ fontFamily: FONT.mono, fontSize: 32, marginTop: 10 }}>{n.v}</div>
              </Panel>
            </Appear>
            {i < 2 && (
              <div style={{ alignSelf: "center", fontSize: 44, color: C.subtle, opacity: ease(t, b[0] + 2 + i * 1.6) }}>→</div>
            )}
          </React.Fragment>
        ))}
      </Row>
      <Appear at={b[1]} style={{ marginTop: 44 }}>
        <div
          style={{
            border: `2px dashed ${C.cyan}`,
            borderRadius: 22,
            padding: "22px 30px",
            fontSize: 34,
            color: C.text,
            background: "rgba(34,211,238,0.05)",
          }}
        >
          An R script records every step, so anyone can <span style={{ color: C.cyan }}>re-run it</span> and get the same numbers.
        </div>
      </Appear>
      <Row gap={20} style={{ marginTop: 40 }}>
        {["Free & open source", "Scriptable", "Re-runnable"].map((x, i) => (
          <Appear key={x} at={b[2] + i * 0.7}>
            <Chip color={[C.violet, C.cyan, C.emerald][i]}>{x}</Chip>
          </Appear>
        ))}
      </Row>
      <Appear at={b[3]} style={{ marginTop: 44, fontFamily: FONT.mono, fontSize: 26, color: C.subtle }}>
        IN THIS LESSON → vectors · functions · missing values · data frames · a messy real-world export
      </Appear>
    </Frame>
  );
};

const SITE_VALUES = ['"BOS-01"', '"bos01"', '"NYC-02"', '" nyc-02"', null, '"CHI-03"'];
const SITE_UPPER = ['"BOS-01"', '"BOS01"', '"NYC-02"', '" NYC-02"', null, '"CHI-03"'];

export const S02: React.FC = () => {
  const b = useBeats("s02");
  const t = useSec();
  const upper = t >= b[4] + 1.6;
  return (
    <Frame chapter="Vectors">
      <Heading kicker="Chapter 2" title="The vector: one type, many values" />
      <div style={{ marginTop: 50 }}>
        <Code
          style={{ width: 1180 }}
          lines={[
            { code: 'sites <- c("BOS-01", "bos01", "NYC-02", " nyc-02", NA, "CHI-03")', at: b[1] },
            { code: "typeof(sites)", at: b[3], out: '[1] "character"' },
            { code: "length(sites)", at: b[3] + 1.3, out: "[1] 6" },
            { code: "toupper(sites)", at: b[4], out: '[1] "BOS-01"  "BOS01"   "NYC-02"  " NYC-02" NA        "CHI-03"' },
          ]}
          highlight={[{ lines: [3], from: b[4], to: b[5] + 2 }]}
          fontSize={28}
        />
      </div>
      <div style={{ marginTop: 44 }}>
        <Cells
          at={b[2]}
          label={upper ? "after toupper(): every element at once" : "sites — a character vector of length 6"}
          values={upper ? SITE_UPPER : SITE_VALUES}
          color={(v) => (v === null ? C.gold : upper ? C.emerald : C.cyan)}
          width={250}
        />
      </div>
      <Appear at={b[5]} style={{ position: "absolute", right: 0, top: 260 }}>
        <Chip color={C.emerald}>No loop required</Chip>
      </Appear>
    </Frame>
  );
};

export const S03: React.FC = () => {
  const b = useBeats("s03");
  const t = useSec();
  const merged = t >= b[1] + 2.2;
  const columnText = t >= b[2] + 3;
  const col = ["10.2", "12.9", "11.6", "9.8 kg", "13.4"];
  return (
    <Frame chapter="Vectors">
      <Heading kicker="Chapter 2" title="Mixing types forces a conversion" />
      <Row style={{ marginTop: 60 }} gap={70}>
        <div style={{ width: 900 }}>
          <Code
            lines={[
              { code: 'x <- c(1, "2")', at: b[1] },
              { code: "x", at: b[1] + 0.8, out: '[1] "1" "2"' },
              { code: "typeof(x)", at: b[1] + 1.8, out: '[1] "character"' },
            ]}
          />
          <div style={{ marginTop: 40 }}>
            <Cells
              at={b[1]}
              values={merged ? ['"1"', '"2"'] : ["1", '"2"']}
              color={(v, i) => (merged || i === 1 ? C.violet : C.gold)}
              label={merged ? "both are now text (character)" : "a number and a string"}
              width={200}
            />
          </div>
        </div>
        <Appear at={b[2]} style={{ flex: 1 }}>
          <Panel title="outcome column, as read from a file" style={{ padding: 0 }}>
            <div style={{ padding: "18px 28px", fontFamily: FONT.mono, fontSize: 30 }}>
              {col.map((v, i) => {
                const bad = i === 3;
                return (
                  <div
                    key={i}
                    style={{
                      padding: "8px 0",
                      color: bad ? C.coral : columnText ? C.violet : C.gold,
                      borderBottom: `1px solid ${C.line}`,
                    }}
                  >
                    {columnText ? `"${v}"` : v}
                    {bad && <span style={{ fontSize: 22, marginLeft: 16, color: C.coral }}>← one stray character</span>}
                  </div>
                );
              })}
              <div style={{ marginTop: 14, color: columnText ? C.coral : C.subtle, fontSize: 26 }}>
                {columnText ? 'typeof(outcome)  "character"  — the whole column' : "expected: numeric"}
              </div>
            </div>
          </Panel>
        </Appear>
      </Row>
      <Appear at={b[3]} style={{ marginTop: 34 }}>
        <Chip color={C.cyan}>Check on arrival: typeof() · class() · str()</Chip>
      </Appear>
    </Frame>
  );
};

export const S04: React.FC = () => {
  const b = useBeats("s04");
  const t = useSec();
  // Word times in sentence 2 (words.json): "trims", "lower case", "sub".
  const TRIM = b[1] + 2.4;
  const LOWER = b[1] + 4.1;
  const SUB = b[1] + 7.8;
  const steps = [
    { fn: "input", v: '" WEEK-12"', at: b[1] },
    { fn: "trimws()", v: '"WEEK-12"', at: TRIM },
    { fn: "tolower()", v: '"week-12"', at: LOWER },
    { fn: "sub()", v: '"Week 12"', at: SUB },
  ];
  return (
    <Frame chapter="Writing a function">
      <Heading kicker="Chapter 3" title="Repeat a step? Write a function." />
      <Row style={{ marginTop: 50 }} gap={60}>
        <Code
          style={{ width: 1040 }}
          title="clean_visit.R"
          fontSize={24}
          lines={[
            { code: "clean_visit <- function(x) {", at: b[0] + 0.8 },
            { code: "  x <- tolower(trimws(x))", at: b[0] + 1.6 },
            { code: '  sub("^w(ee)?k[ -]?([0-9]+)$", "Week \\\\2", x)', at: b[0] + 2.6 },
            { code: "}", at: b[0] + 4.0 },
            { code: "", at: b[3] },
            { code: 'visits <- c("Week 12", "wk12", " WEEK-12", "week 4", NA, "Wk 4 ")', at: b[3] + 0.2 },
            { code: "clean_visit(visits)", at: b[3] + 0.8, out: '[1] "Week 12" "Week 12" "Week 12" "Week 4"  NA        "Week 4" ', outColor: C.emerald },
          ]}
          highlight={[
            { lines: [1], from: b[1], to: SUB - 0.2 },
            { lines: [2], from: SUB - 0.2, to: b[2] },
            { lines: [2], from: b[2], to: b[3] },
          ]}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          {steps.map((s, i) => (
            <Appear key={s.fn} at={s.at}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 170, fontFamily: FONT.mono, fontSize: 24, color: i === 0 ? C.subtle : C.cyan }}>{s.fn}</div>
                <div
                  style={{
                    flex: 1,
                    fontFamily: FONT.mono,
                    fontSize: 32,
                    whiteSpace: "pre",
                    padding: "14px 22px",
                    borderRadius: 14,
                    border: `2px solid ${i === 3 ? C.emerald : C.line}`,
                    background: C.panel,
                    color: i === 3 ? C.emerald : C.text,
                  }}
                >
                  {s.v}
                </div>
              </div>
            </Appear>
          ))}
          <Appear at={b[2]} style={{ marginTop: 10 }}>
            <div style={{ fontSize: 26, color: C.muted, lineHeight: 1.45 }}>
              <span style={{ color: C.violet, fontFamily: FONT.mono }}>sub()</span> pattern: wk or week, an optional space
              or hyphen, digits → rebuilt as <span style={{ fontFamily: FONT.mono }}>"Week 12"</span>. The last value is returned.
            </div>
          </Appear>
        </div>
      </Row>
      <Appear at={b[3] + 1.2} style={{ marginTop: 30 }}>
        <Chip color={C.emerald}>{"One tested function → every label, every file"}</Chip>
      </Appear>
    </Frame>
  );
};

export const S05: React.FC = () => {
  const b = useBeats("s05");
  const t = useSec();
  const mask = t >= b[4] + 2.2;
  return (
    <Frame chapter="Missing observations">
      <Heading kicker="Chapter 4" title="NA: R refuses to guess" />
      <Row style={{ marginTop: 50 }} gap={60}>
        <Code
          style={{ width: 1000 }}
          fontSize={30}
          lines={[
            { code: "outcome <- c(10.2, NA, 11.6, 9.8)", at: b[0] + 0.4 },
            { code: "mean(outcome)", at: b[1] + 1.5, out: "[1] NA", outColor: C.gold },
            { code: "is.na(outcome)", at: b[4] + 0.6, out: "[1] FALSE  TRUE FALSE FALSE" },
            { code: "sum(is.na(outcome))", at: b[4] + 2.4, out: "[1] 1" },
            { code: "mean(outcome, na.rm = TRUE)", at: b[4] + 4.4, out: "[1] 10.53333", outColor: C.emerald },
          ]}
          highlight={[{ lines: [1], from: b[1] + 1.5, to: b[4] }]}
        />
        <div style={{ flex: 1 }}>
          <Cells
            at={b[0] + 0.6}
            values={["10.2", null, "11.6", "9.8"]}
            label="outcome"
            width={150}
            color={(v) => (v === null ? C.gold : C.cyan)}
          />
          {mask && (
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              {["FALSE", "TRUE", "FALSE", "FALSE"].map((v, i) => (
                <div
                  key={i}
                  style={{
                    width: 150,
                    textAlign: "center",
                    fontFamily: FONT.mono,
                    fontSize: 22,
                    color: v === "TRUE" ? C.gold : C.subtle,
                    opacity: ease(t, b[4] + 2.2 + i * 0.08),
                  }}
                >
                  {v}
                </div>
              ))}
            </div>
          )}
          <Appear at={b[2]} style={{ marginTop: 40 }}>
            <Panel style={{ padding: "22px 26px", borderColor: "rgba(251,191,36,0.4)" }}>
              <div style={{ fontSize: 28, lineHeight: 1.45 }}>
                <span style={{ color: C.gold }}>NA is contagious</span> — any calculation that touches an unknown value is
                unknown. That's a feature.
              </div>
            </Panel>
          </Appear>
        </div>
      </Row>
      <Appear at={b[4] + 4.6} style={{ marginTop: 26 }}>
        <Chip color={C.emerald}>Drop missing values only on purpose: na.rm = TRUE</Chip>
      </Appear>
    </Frame>
  );
};

const TRIAL_ROWS: (string | number | null)[][] = [
  ["P01", "Placebo", "Week 12", 10.2],
  ["P02", "Treatment", "Week 12", 12.9],
  ["P03", "Placebo", "Week 12", null],
  ["P04", "Treatment", "Week 12", 13.4],
  ["P05", "Placebo", "Baseline", 9.7],
  ["P06", "Treatment", "Baseline", 12.1],
];

export const S06: React.FC = () => {
  const b = useBeats("s06");
  const t = useSec();
  const pickCol = t >= b[3] + 0.6 && t < b[3] + 4.4;
  const filtered = t >= b[3] + 5.2;
  return (
    <Frame chapter="Data frames">
      <Heading kicker="Chapter 5" title="A data frame is a table of vectors" />
      <Row style={{ marginTop: 50 }} gap={60}>
        <div style={{ width: 900 }}>
          <Table
            at={b[0] + 0.5}
            columns={["id", "arm", "visit", "outcome"]}
            colWidths={[0.7, 1.2, 1.1, 1]}
            rows={TRIAL_ROWS}
            rowStyle={(i) => ({
              opacity: filtered && i >= 4 ? 0.18 : undefined,
              background: pickCol ? "transparent" : undefined,
            })}
          />
          <Appear at={b[1]} style={{ marginTop: 22, fontSize: 26, color: C.muted }}>
            4 columns, each a vector of length 6 — <span style={{ color: C.cyan }}>character</span>,{" "}
            <span style={{ color: C.cyan }}>character</span>, <span style={{ color: C.cyan }}>character</span>,{" "}
            <span style={{ color: C.gold }}>double</span>
          </Appear>
        </div>
        <div style={{ flex: 1 }}>
          <Code
            fontSize={27}
            lines={[
              { code: "trial$outcome", at: b[3], out: "[1] 10.2 12.9   NA 13.4  9.7 12.1" },
              { code: 'trial[trial$visit == "Week 12", ]', at: b[3] + 4.4, out: "  4 rows: P01 P02 P03 P04" },
            ]}
          />
          <Appear at={b[2]} style={{ marginTop: 30 }}>
            <Chip color={C.violet}>Synthetic trial · 6 rows · no real patients</Chip>
          </Appear>
        </div>
      </Row>
    </Frame>
  );
};

export const S07: React.FC = () => {
  const b = useBeats("s07");
  const t = useSec();
  const result = t >= b[1] + 5.5;
  return (
    <Frame chapter="Grouped summaries">
      <Heading kicker="Chapter 6" title="Summaries by group, with dplyr" />
      <Row style={{ marginTop: 44 }} gap={56}>
        <Code
          style={{ width: 960 }}
          title="summary.R"
          fontSize={27}
          lines={[
            { code: "library(dplyr)", at: b[1] - 0.4 },
            { code: "trial |>", at: b[1] },
            { code: '  filter(visit == "Week 12") |>', at: b[1] + 0.6 },
            { code: "  group_by(arm) |>", at: b[1] + 1.6 },
            { code: "  summarise(", at: b[1] + 2.4 },
            { code: "    rows = n(),", at: b[1] + 3.0 },
            { code: "    n    = sum(!is.na(outcome)),", at: b[1] + 3.6 },
            { code: "    mean = mean(outcome, na.rm = TRUE)", at: b[1] + 4.4 },
            { code: "  )", at: b[1] + 5.2 },
          ]}
          highlight={[
            { lines: [2], from: b[1] + 0.6, to: b[1] + 1.6 },
            { lines: [3], from: b[1] + 1.6, to: b[1] + 2.4 },
            { lines: [5, 6], from: b[3], to: b[4] + 3 },
          ]}
        />
        <div style={{ flex: 1 }}>
          {!result ? (
            <Table
              at={b[1] + 0.8}
              columns={["arm", "outcome"]}
              rows={[
                ["Placebo", 10.2],
                ["Placebo", null],
                ["Treatment", 12.9],
                ["Treatment", 13.4],
              ]}
              rowStyle={(i) => ({ boxShadow: `inset 5px 0 0 ${i < 2 ? C.violet : C.cyan}` })}
            />
          ) : (
            <Table
              at={b[1] + 5.5}
              columns={["arm", "rows", "n", "mean"]}
              colWidths={[1.4, 0.7, 0.6, 0.9]}
              rows={[
                ["Placebo", 2, 1, "10.20"],
                ["Treatment", 2, 2, "13.15"],
              ]}
              rowStyle={(i) => ({
                boxShadow: `inset 5px 0 0 ${i === 0 ? C.violet : C.cyan}`,
                background: i === 0 && t >= b[3] ? "rgba(251,191,36,0.08)" : undefined,
              })}
            />
          )}
          <Appear at={b[2]} style={{ marginTop: 28 }}>
            <Panel style={{ padding: "20px 24px", borderColor: "rgba(251,191,36,0.4)" }}>
              <div style={{ fontSize: 27, lineHeight: 1.45 }}>
                Placebo has <span style={{ color: C.gold }}>2 rows but 1 observation</span>.{" "}
                <span style={{ fontFamily: FONT.mono, color: C.cyan }}>n()</span> counts rows; count non-missing values
                explicitly.
              </div>
            </Panel>
          </Appear>
        </div>
      </Row>
    </Frame>
  );
};

const CSV = [
  "participant_id,site,enrolled,age,arm",
  "1,bos01,2026-01-05,34,Placebo",
  "2, NYC-02,01/12/2026,41,treatment",
  "3,chi03,15 Jan 2026,,TREATMENT",
  "3,chi03,15 Jan 2026,,TREATMENT",
  "4,BOS-01,2026-01-20,NA,placebo",
];

export const S08: React.FC = () => {
  const b = useBeats("s08");
  const issues = [
    { label: "inconsistent site codes", color: C.cyan, rows: [1, 2, 3] },
    { label: "blank / NA ages", color: C.gold, rows: [3, 5] },
    { label: "duplicate participant", color: C.coral, rows: [4] },
    { label: "three date formats", color: C.violet, rows: [1, 2, 3] },
  ];
  const t = useSec();
  const activeIssue = issues.findIndex((_, i) => t >= b[2] + i * 1.7 && t < b[2] + (i + 1) * 1.7);
  return (
    <Frame chapter="A realistic example">
      <Heading kicker="Chapter 7" title="A real export is never clean" />
      <Row style={{ marginTop: 50 }} gap={56}>
        <Appear at={b[1]} style={{ width: 980 }}>
          <Panel title="enrollment_export.csv  (synthetic)">
            <div style={{ padding: "18px 28px", fontFamily: FONT.mono, fontSize: 28, lineHeight: 1.7 }}>
              {CSV.map((l, i) => {
                const issue = activeIssue >= 0 ? issues[activeIssue] : null;
                const on = issue && issue.rows.includes(i);
                return (
                  <div
                    key={i}
                    style={{
                      whiteSpace: "pre",
                      color: i === 0 ? C.subtle : C.text,
                      background: on ? `color-mix(in srgb, ${issue!.color} 14%, transparent)` : "transparent",
                      boxShadow: on ? `inset 4px 0 0 ${issue!.color}` : "none",
                      margin: "0 -28px",
                      padding: "0 28px",
                    }}
                  >
                    {l}
                  </div>
                );
              })}
            </div>
          </Panel>
        </Appear>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {issues.map((iss, i) => (
            <Appear key={iss.label} at={b[2] + i * 1.7}>
              <Chip color={iss.color}>{iss.label}</Chip>
            </Appear>
          ))}
        </div>
      </Row>
      <div style={{ marginTop: 34 }}>
        <Code
          style={{ width: 1500 }}
          fontSize={27}
          lines={[{ code: 'raw <- read.csv("enrollment_export.csv", colClasses = "character")', at: b[3] }]}
        />
      </div>
      <Appear at={b[4]} style={{ marginTop: 22, fontFamily: FONT.mono, fontSize: 26, color: C.emerald }}>
        then: clean site codes → parse dates → fix types → unique() → order()
      </Appear>
    </Frame>
  );
};

export const S09: React.FC = () => {
  const b = useBeats("s09");
  const t = useSec();
  const pass = t >= b[1] + 4.6 ? 3 : t >= b[1] + 3 ? 2 : t >= b[1] + 1.2 ? 1 : 0;
  const parsed = [
    ["2026-01-05", null, null],
    ["2026-01-05", "2026-01-12", null],
    ["2026-01-05", "2026-01-12", "2026-01-15"],
  ];
  const vals = pass === 0 ? [null, null, null] : parsed[pass - 1];
  return (
    <Frame chapter="A realistic example">
      <Heading kicker="Chapter 7" title="Parse dates one format at a time" />
      <Row style={{ marginTop: 44 }} gap={56}>
        <Code
          style={{ width: 1080 }}
          title="prepare_enrollment.R"
          fontSize={26}
          lines={[
            { code: 'd <- c("2026-01-05", "01/12/2026", "15 Jan 2026")', at: b[0] + 0.2 },
            { code: 'dt <- as.Date(d, format = "%Y-%m-%d")', at: b[1] + 0.3 },
            { code: 'dt[is.na(dt)] <- as.Date(d[is.na(dt)], format = "%m/%d/%Y")', at: b[1] + 1.8 },
            { code: 'dt[is.na(dt)] <- as.Date(d[is.na(dt)], format = "%d %b %Y")', at: b[1] + 3.4 },
            { code: 'arm <- factor(arm, levels = c("Placebo", "Treatment"))', at: b[2] + 0.4 },
            { code: "out <- unique(out); out <- out[order(out$participant_id), ]", at: b[2] + 2.6 },
          ]}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.subtle, marginBottom: 12 }}>
            {pass === 0 ? "raw text" : `after pass ${pass} of 3`}
          </div>
          {["2026-01-05", "01/12/2026", "15 Jan 2026"].map((raw, i) => (
            <div key={raw} style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
              <div style={{ width: 230, fontFamily: FONT.mono, fontSize: 26, color: C.muted }}>{raw}</div>
              <div style={{ color: C.subtle, fontSize: 28 }}>→</div>
              <div
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: `2px solid ${vals[i] ? C.emerald : C.gold}`,
                  fontFamily: FONT.mono,
                  fontSize: 26,
                  color: vals[i] ? C.emerald : C.gold,
                }}
              >
                {vals[i] ?? "NA"}
              </div>
            </div>
          ))}
        </div>
      </Row>
      <Row gap={22} style={{ marginTop: 40 }}>
        {[
          { at: b[3] + 0.6, text: "✓ one row per participant" },
          { at: b[3] + 1.8, text: "✓ every date parsed" },
          { at: b[3] + 3.0, text: "✓ only expected NAs (ages left blank in the source)" },
        ].map((c) => (
          <Appear key={c.text} at={c.at}>
            <Chip color={C.emerald}>{c.text}</Chip>
          </Appear>
        ))}
      </Row>
    </Frame>
  );
};

export const S10: React.FC = () => {
  const b = useBeats("s10");
  const checks = [
    "clean_site() is defined as a function",
    "Cleans the preloaded sites vector",
    "Works on site codes it hasn't seen",
    "Keeps missing values as NA and preserves length",
    "Returns character(0) for empty input",
  ];
  return (
    <Frame chapter="Your first mission">
      <Heading kicker="Mission" title="Now it's your turn" />
      <Row gap={18} style={{ marginTop: 36 }}>
        {["vectors", "functions", "missing values", "data frames"].map((x, i) => (
          <Appear key={x} at={b[0] + i * 0.5}>
            <Chip color={[C.cyan, C.violet, C.gold, C.emerald][i]}>{x}</Chip>
          </Appear>
        ))}
      </Row>
      <Appear at={b[1]} style={{ marginTop: 44 }}>
        <Panel style={{ padding: "34px 40px", borderColor: "rgba(34,211,238,0.45)", width: 1300 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: "0.16em", color: C.cyan }}>
            WORLD 1 · CODING CHALLENGE · 50 XP
          </div>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 52, marginTop: 10 }}>Clean the site codes</div>
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {checks.map((c, i) => (
              <Appear key={c} at={b[2] + 0.5 + i * 0.6} dy={8}>
                <div style={{ fontSize: 28, color: C.muted }}>
                  <span style={{ color: C.emerald, marginRight: 14 }}>●</span>
                  {c}
                </div>
              </Appear>
            ))}
          </div>
        </Panel>
      </Appear>
      <Appear at={b[3]} style={{ marginTop: 28 }}>
        <Chip color={C.emerald}>Runs real R in your browser · checked against hidden tests</Chip>
      </Appear>
    </Frame>
  );
};

export const Outro: React.FC = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: C.bg, display: "grid", placeItems: "center" }}>
      <AbsoluteFill style={{ background: "radial-gradient(50% 45% at 50% 50%, rgba(34,211,238,0.16), transparent 70%)" }} />
      <div style={{ textAlign: "center", opacity: ease(t, 0.1, 0.8) }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LogoMark size={96} />
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 64, marginTop: 26 }}>
          Next: <span style={{ color: C.cyan }}>Clean the site codes</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontSize: 28, color: C.subtle, marginTop: 20 }}>
          RQuest · Research Programmer Academy · all data synthetic · independent project
        </div>
      </div>
    </AbsoluteFill>
  );
};
