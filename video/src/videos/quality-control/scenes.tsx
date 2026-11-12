import React from "react";
import { AbsoluteFill } from "remotion";
import { Console, File, Tree } from "../../blocks";
import { Appear, C, Chip, Code, ease, FONT, Frame, Heading, LogoMark, Panel, useBeats, useSec, useSpring } from "../../kit";

/*
 * Video 4: Testing and Independent QC.
 * Outputs produced with R 4.6.1, testthat 3.3.2, rlang 1.3.0; QC table from the World 4
 * boss's synthetic ADSL (seed 2026, 60 subjects). testthat's celebration emoji omitted.
 */

const A = C.emerald;
const Row: React.FC<{ children: React.ReactNode; gap?: number; style?: React.CSSProperties }> = ({ children, gap = 44, style }) => (
  <div style={{ display: "flex", gap, alignItems: "flex-start", ...style }}>{children}</div>
);
const H: React.FC<{ n: number; title: string }> = ({ n, title }) => <Heading kicker={`Chapter ${n}`} title={title} color={A} />;

export const Intro: React.FC = () => {
  const t = useSec();
  const s = useSpring(0.2);
  return (
    <AbsoluteFill style={{ background: C.bg, display: "grid", placeItems: "center" }}>
      <AbsoluteFill style={{ background: "radial-gradient(50% 45% at 50% 45%, rgba(52,211,153,0.2), transparent 70%)" }} />
      <div style={{ textAlign: "center", transform: `scale(${0.9 + 0.1 * s})`, opacity: s }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LogoMark size={120} />
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 26, letterSpacing: "0.22em", color: A, marginTop: 34, opacity: ease(t, 0.6) }}>WORLD 4 · QUALITY CONTROL</div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 84, color: C.text, letterSpacing: "-0.02em", marginTop: 14, opacity: ease(t, 0.9) }}>
          Testing and Independent QC
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Q01: React.FC = () => {
  const b = useBeats("q01");
  const kinds = [
    { k: "Tests", v: "that catch real bugs", c: C.cyan },
    { k: "Validation", v: "inputs that fail loudly", c: C.gold },
    { k: "Independent QC", v: "a second implementation", c: A },
  ];
  return (
    <Frame chapter="Trust needs evidence">
      <H n={1} title="Nothing ships without verification" />
      <Appear at={b[0] + 0.3} style={{ marginTop: 50 }}>
        <Panel style={{ padding: "26px 34px", display: "inline-block" }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.subtle }}>demographics_table.csv</div>
          <div style={{ fontFamily: FONT.display, fontSize: 40, marginTop: 6 }}>→ report → decisions</div>
        </Panel>
      </Appear>
      <Row gap={26} style={{ marginTop: 50 }}>
        {kinds.map((x, i) => (
          <Appear key={x.k} at={b[3] + 0.6 + i * 0.9} style={{ flex: 1 }}>
            <Panel style={{ padding: "26px 30px", borderColor: `color-mix(in srgb, ${x.c} 45%, transparent)` }}>
              <div style={{ fontFamily: FONT.display, fontSize: 64, fontWeight: 700, color: x.c }}>{i + 1}</div>
              <div style={{ fontFamily: FONT.display, fontSize: 34, fontWeight: 700, marginTop: 6 }}>{x.k}</div>
              <div style={{ fontSize: 26, color: C.muted, marginTop: 6 }}>{x.v}</div>
            </Panel>
          </Appear>
        ))}
      </Row>
    </Frame>
  );
};

export const Q02: React.FC = () => {
  const b = useBeats("q02");
  return (
    <Frame chapter="Tests with testthat">
      <H n={2} title="Expectations state what must be true" />
      <Row style={{ marginTop: 44 }} gap={36}>
        <div style={{ width: 1120 }}>
          <File
            name="tests/testthat/test-summarise_arm.R"
            at={b[0] + 0.4}
            fontSize={25}
            lines={[
              'test_that("summarise_arm ignores missing outcomes", {',
              '  df <- data.frame(arm = c("A", "A", "B"), outcome = c(1, NA, 3))',
              "  r <- summarise_arm(df)",
              '  expect_equal(r$mean[r$arm == "A"], 1)',
              '  expect_identical(r$n[r$arm == "A"], 1L)',
              "})",
              "",
              'test_that("empty input is refused", {',
              "  expect_error(summarise_arm(df[0, ]))",
              "})",
            ]}
            highlight={[
              { lines: [3], from: b[1], to: b[2], color: C.cyan },
              { lines: [4], from: b[2], to: b[3], color: C.cyan },
              { lines: [8], from: b[3], to: b[4], color: C.cyan },
            ]}
          />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            ["expect_equal()", "values, small numeric tolerance", b[1]],
            ["expect_identical()", "exact: type and value", b[2]],
            ["expect_error()", "bad input is refused", b[3]],
          ].map(([k, v, at]) => (
            <Appear key={k as string} at={at as number}>
              <Panel style={{ padding: "16px 22px" }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 26, color: C.cyan }}>{k}</div>
                <div style={{ fontSize: 22, color: C.muted, marginTop: 4 }}>{v}</div>
              </Panel>
            </Appear>
          ))}
        </div>
      </Row>
    </Frame>
  );
};

export const Q03: React.FC = () => {
  const b = useBeats("q03");
  return (
    <Frame chapter="Would your test catch the bug?">
      <H n={3} title="Would this test fail if the code were wrong?" />
      <Row style={{ marginTop: 44 }} gap={36}>
        <div style={{ width: 900 }}>
          <Panel title="real summarise_arm()  vs  mutant (counts NA in n)" style={{ padding: 0 }}>
            <div style={{ padding: "18px 26px", fontFamily: FONT.mono, fontSize: 26, lineHeight: 1.6 }}>
              <Appear at={b[2]}>
                <div style={{ color: C.subtle }}>real</div>
                <div>{"  arm n mean"}</div>
                <div>{"1   A 1    1"}</div>
                <div>{"2   B 1    3"}</div>
              </Appear>
              <Appear at={b[2] + 2} style={{ marginTop: 12 }}>
                <div style={{ color: C.coral }}>mutant</div>
                <div>{"  arm n mean"}</div>
                <div>
                  {"1   A "}
                  <span style={{ color: C.coral }}>2</span>
                  {"    1"}
                </div>
                <div>{"2   B 1    3"}</div>
              </Appear>
            </div>
          </Panel>
        </div>
        <div style={{ flex: 1 }}>
          <Appear at={b[3]}>
            <Code title="weak test" fontSize={24} lines={[{ code: 'test_that("returns a data frame",', at: b[3] + 0.2 }, { code: "  expect_true(is.data.frame(mutant(df))))", at: b[3] + 1 }]} />
          </Appear>
          <Appear at={b[3] + 2.6} style={{ marginTop: 18 }}>
            <Console title="testthat (real output)" fontSize={24} lines={[{ text: "Test passed with 1 success.", color: C.gold, at: b[3] + 2.8 }]} />
          </Appear>
          <Appear at={b[4]} style={{ marginTop: 22 }}>
            <Chip color={C.coral}>passes on broken code: protects nothing</Chip>
          </Appear>
        </div>
      </Row>
    </Frame>
  );
};

export const Q04: React.FC = () => {
  const b = useBeats("q04");
  return (
    <Frame chapter="Would your test catch the bug?">
      <H n={3} title="Test the behaviour that matters" />
      <Row style={{ marginTop: 44 }} gap={36}>
        <div style={{ width: 1000 }}>
          <Code
            title="strong test"
            fontSize={25}
            lines={[
              { code: 'test_that("n counts observations", {', at: b[0] + 0.4 },
              { code: "  r <- mutant(df)", at: b[0] + 1.2 },
              { code: '  expect_equal(r$n[r$arm == "A"], 1)', at: b[1] },
              { code: "})", at: b[1] + 1.2 },
            ]}
          />
          <Appear at={b[1] + 1.6} style={{ marginTop: 18 }}>
            <Console
              title="testthat (real output)"
              fontSize={23}
              lines={[
                { text: "── Failure: n counts observations ──────────", color: C.coral, at: b[1] + 1.8 },
                { text: 'Expected `r$n[r$arm == "A"]` to equal 1.', color: C.text, at: b[2] },
                { text: "Differences:", at: b[2] + 0.4 },
                { text: "1/1 mismatches", at: b[2] + 0.4 },
                { text: "[1] 2 - 1 == 1", color: C.gold, at: b[2] + 0.8 },
              ]}
            />
          </Appear>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {["missing values", "empty input", "a group of one"].map((x, i) => (
            <Appear key={x} at={b[3] + i * 0.7}>
              <Chip color={A}>edge: {x}</Chip>
            </Appear>
          ))}
        </div>
      </Row>
    </Frame>
  );
};

export const Q05: React.FC = () => {
  const b = useBeats("q05");
  return (
    <Frame chapter="Fail loudly, fail clearly">
      <H n={4} title="Validate at the boundary" />
      <Row style={{ marginTop: 50 }} gap={40} >
        <div style={{ width: 760 }}>
          <Tree
            fontSize={28}
            entries={[
              { name: "raw data", depth: 0, dir: true, at: b[1], color: C.gold },
              { name: "validate_trial()", depth: 1, at: b[1] + 0.6, color: A, note: "stop bad input here" },
              { name: "summarise_arm()", depth: 2, at: b[1] + 1.2 },
              { name: "report tables", depth: 3, at: b[1] + 1.8 },
            ]}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Console
            title="R (real output)"
            fontSize={25}
            lines={[
              { text: "> stopifnot(is.numeric(df$outcome))", color: C.text, at: b[2] },
              { text: "Error: is.numeric(df$outcome) is not TRUE", color: C.coral, at: b[2] + 0.8 },
            ]}
          />
          <Appear at={b[3]} style={{ marginTop: 24 }}>
            <Panel style={{ padding: "20px 24px", borderColor: "rgba(251,191,36,0.4)" }}>
              <div style={{ fontSize: 28 }}>A colleague needs: <span style={{ color: C.gold }}>which column · what was wrong · how to fix it</span></div>
            </Panel>
          </Appear>
        </div>
      </Row>
    </Frame>
  );
};

export const Q06: React.FC = () => {
  const b = useBeats("q06");
  return (
    <Frame chapter="Classed errors">
      <H n={5} title="Errors with a message and a class" />
      <Row style={{ marginTop: 44 }} gap={36}>
        <div style={{ width: 1040 }}>
          <Code
            title="console (real output)"
            fontSize={24}
            lines={[
              { code: 'e <- tryCatch(rlang::abort("outcome must be numeric, not character.",', at: b[0] + 0.3 },
              { code: '  class = "rquest_invalid_input"), error = function(e) e)', at: b[0] + 1.8 },
              { code: "class(e)", at: b[1], out: '[1] "rquest_invalid_input" "rlang_error" "error" "condition"', outColor: A },
              { code: "conditionMessage(e)", at: b[1] + 1.6, out: '[1] "outcome must be numeric, not character."' },
            ]}
          />
        </div>
        <div style={{ flex: 1 }}>
          <File
            name="test (passes, real)"
            at={b[2]}
            fontSize={23}
            lines={['test_that("bad input", expect_error(', "  validate_trial(dup_ids),", '  class = "rquest_invalid_input",', '  regexp = "P002"))']}
            highlight={[{ lines: [2, 3], from: b[2] + 1.2, color: A }]}
          />
          <Appear at={b[2] + 2.6} style={{ marginTop: 18 }}>
            <Chip color={A}>right kind of error · names the offender</Chip>
          </Appear>
        </div>
      </Row>
    </Frame>
  );
};

export const Q07: React.FC = () => {
  const b = useBeats("q07");
  const t = useSec();
  return (
    <Frame chapter="Independent double programming">
      <H n={6} title="Two programmers, one specification" />
      <div style={{ position: "relative", height: 520, marginTop: 40 }}>
        <Appear at={b[0] + 0.3} style={{ position: "absolute", left: 660, top: 0, width: 440 }}>
          <Panel style={{ padding: "20px 26px", textAlign: "center", borderColor: "rgba(251,191,36,0.45)" }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.gold }}>SPECIFICATION</div>
            <div style={{ fontSize: 26, marginTop: 6 }}>n, age mean/SD, % female by arm</div>
          </Panel>
        </Appear>
        <Appear at={b[1]} style={{ position: "absolute", left: 120, top: 220, width: 520 }}>
          <Panel style={{ padding: "22px 26px" }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.cyan }}>PRODUCTION PROGRAMMER</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 26, marginTop: 8 }}>demographics.R</div>
          </Panel>
        </Appear>
        <Appear at={b[1] + 1} style={{ position: "absolute", right: 120, top: 220, width: 520 }}>
          <Panel style={{ padding: "22px 26px", borderColor: "rgba(52,211,153,0.5)" }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: A }}>QC PROGRAMMER</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 26, marginTop: 8 }}>qc_demographics.R</div>
            <div style={{ fontSize: 20, color: C.subtle, marginTop: 6 }}>never reads demographics.R</div>
          </Panel>
        </Appear>
        <div style={{ position: "absolute", left: 640, top: 400, width: 640, textAlign: "center", opacity: ease(t, b[2]) }}>
          <Chip color={A}>agree → strong evidence</Chip>
          <span style={{ display: "inline-block", width: 20 }} />
          <Chip color={C.coral} style={{ opacity: ease(t, b[3]) }}>
            disagree → bug found first
          </Chip>
        </div>
      </div>
    </Frame>
  );
};

export const Q08: React.FC = () => {
  const b = useBeats("q08");
  return (
    <Frame chapter="Comparing with tolerance">
      <H n={7} title="Floating point isn't exact" />
      <div style={{ marginTop: 44, width: 1300 }}>
        <Code
          title="console (real output)"
          fontSize={30}
          lines={[
            { code: "0.1 + 0.2 == 0.3", at: b[1], out: "[1] FALSE", outColor: C.coral },
            { code: "format(0.1 + 0.2, digits = 17)", at: b[1] + 1.6, out: '[1] "0.30000000000000004"' },
            { code: "isTRUE(all.equal(0.1 + 0.2, 0.3))", at: b[2], out: "[1] TRUE", outColor: A },
            { code: "abs((0.1 + 0.2) - 0.3) > 1e-8", at: b[2] + 2, out: "[1] FALSE", outColor: A },
          ]}
        />
      </div>
      <Appear at={b[2] + 3.6} style={{ marginTop: 26 }}>
        <Chip color={A}>noise → agreement · real differences → discrepancies</Chip>
      </Appear>
    </Frame>
  );
};

export const Q09: React.FC = () => {
  const b = useBeats("q09");
  return (
    <Frame chapter="The discrepancy report">
      <H n={8} title="One row per disagreement" />
      <Row style={{ marginTop: 40 }} gap={30}>
        <div style={{ width: 960 }}>
          <Panel title="QC table (synthetic ADSL, real values)" style={{ padding: 0 }}>
            <div style={{ padding: "16px 24px", fontFamily: FONT.mono, fontSize: 25, lineHeight: 1.7 }}>
              <Appear at={b[0] + 0.3}>
                <div style={{ color: C.subtle }}>{"        arm  n age_mean age_sd pct_female"}</div>
                <div>{"1   Placebo 29    50.17  15.60      44.83"}</div>
                <div>
                  {"2 Treatment 31    51.58  15.98      "}
                  <span style={{ color: A }}>48.39</span>
                </div>
              </Appear>
            </div>
          </Panel>
          <Appear at={b[2]} style={{ marginTop: 22 }}>
            <Panel title="compare_tables(prod, qc)" style={{ padding: 0, borderColor: "rgba(251,113,133,0.5)" }}>
              <div style={{ padding: "16px 24px", fontFamily: FONT.mono, fontSize: 25, lineHeight: 1.7 }}>
                <div style={{ color: C.subtle }}>{"        arm     column prod    qc"}</div>
                <div>
                  {"1 Treatment pct_female "}
                  <span style={{ color: C.coral }}>25.00</span>
                  {" "}
                  <span style={{ color: A }}>48.39</span>
                </div>
              </div>
            </Panel>
          </Appear>
        </div>
        <Appear at={b[3]} style={{ flex: 1 }}>
          <Panel style={{ padding: "22px 26px", borderColor: "rgba(251,191,36,0.45)" }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.gold }}>ROOT CAUSE</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 26, marginTop: 12 }}>15 / 60 = 25.0%</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 26, color: A }}>15 / 31 = 48.4%</div>
            <div style={{ fontSize: 23, color: C.muted, marginTop: 12 }}>production divided by all subjects, not the arm</div>
          </Panel>
        </Appear>
      </Row>
    </Frame>
  );
};

export const Q10: React.FC = () => {
  const b = useBeats("q10");
  const missions = [
    { title: "Guard the edge cases", xp: 70, detail: "Tests that pass on the real function and catch four mutants", at: b[1] },
    { title: "Fail loudly, fail clearly", xp: 80, detail: "validate_trial() with classed errors that name the problem", at: b[2] },
    { title: "Boss: Independent QC", xp: 240, detail: "Double-program the table; report every discrepancy and nothing else", at: b[3] },
  ];
  return (
    <Frame chapter="Your Quality Control missions">
      <Heading kicker="Missions" title="Your Quality Control missions" color={A} />
      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 50 }}>
        {missions.map((m, i) => (
          <Appear key={m.title} at={m.at}>
            <Panel style={{ padding: "24px 32px", display: "flex", alignItems: "center", gap: 30, borderColor: i === 2 ? "rgba(52,211,153,0.55)" : C.line }}>
              <div style={{ fontFamily: FONT.display, fontSize: 44, fontWeight: 700, color: A, width: 60 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT.display, fontSize: 36, fontWeight: 700 }}>{m.title}</div>
                <div style={{ fontSize: 24, color: C.muted, marginTop: 6 }}>{m.detail}</div>
              </div>
              <Chip color={A}>{m.xp} XP</Chip>
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
      <AbsoluteFill style={{ background: "radial-gradient(50% 45% at 50% 50%, rgba(52,211,153,0.16), transparent 70%)" }} />
      <div style={{ textAlign: "center", opacity: ease(t, 0.1, 0.8) }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LogoMark size={96} />
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 64, marginTop: 26 }}>
          Next: <span style={{ color: A }}>Guard the edge cases</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontSize: 28, color: C.subtle, marginTop: 20 }}>RQuest · Research Programmer Academy · all data synthetic · independent project</div>
      </div>
    </AbsoluteFill>
  );
};
