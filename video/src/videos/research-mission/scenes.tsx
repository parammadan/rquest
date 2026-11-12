import React from "react";
import { AbsoluteFill } from "remotion";
import { Console, File } from "../../blocks";
import { Appear, C, Chip, Code, ease, FONT, Frame, Heading, LogoMark, Panel, useBeats, useSec, useSpring } from "../../kit";

/*
 * Video 5: Reproducible Statistical Programming.
 * Outputs produced with R 4.6.1 and withr; the trial is the World 5 boss's synthetic
 * export (seed 5, 80 participants).
 */

const A = C.gold;
const Row: React.FC<{ children: React.ReactNode; gap?: number; style?: React.CSSProperties }> = ({ children, gap = 44, style }) => (
  <div style={{ display: "flex", gap, alignItems: "flex-start", ...style }}>{children}</div>
);
const H: React.FC<{ n: number; title: string }> = ({ n, title }) => <Heading kicker={`Chapter ${n}`} title={title} color={A} />;

export const Intro: React.FC = () => {
  const t = useSec();
  const s = useSpring(0.2);
  return (
    <AbsoluteFill style={{ background: C.bg, display: "grid", placeItems: "center" }}>
      <AbsoluteFill style={{ background: "radial-gradient(50% 45% at 50% 45%, rgba(251,191,36,0.18), transparent 70%)" }} />
      <div style={{ textAlign: "center", transform: `scale(${0.9 + 0.1 * s})`, opacity: s }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LogoMark size={120} />
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 26, letterSpacing: "0.22em", color: A, marginTop: 34, opacity: ease(t, 0.6) }}>WORLD 5 · RESEARCH MISSION</div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 84, color: C.text, letterSpacing: "-0.02em", marginTop: 14, opacity: ease(t, 0.9) }}>
          Reproducible Statistical Programming
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const R01: React.FC = () => {
  const b = useBeats("r01");
  return (
    <Frame chapter="The reviewer re-runs everything">
      <H n={1} title="Same inputs, same code, same bytes" />
      <Row style={{ marginTop: 60 }} gap={30}>
        {[
          ["Your run", "results.csv", "md5 1f6c…", C.cyan, b[0] + 0.4],
          ["Reviewer's clean session", "results.csv", "md5 1f6c…", C.emerald, b[0] + 2],
        ].map(([who, f, h, col, at]) => (
          <Appear key={who as string} at={at as number} style={{ flex: 1 }}>
            <Panel style={{ padding: "26px 30px", borderColor: `color-mix(in srgb, ${col} 45%, transparent)` }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 22, color: col as string }}>{who}</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 32, marginTop: 10 }}>{f}</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 24, color: C.subtle, marginTop: 6 }}>{h}</div>
            </Panel>
          </Appear>
        ))}
      </Row>
      <Appear at={b[2]} style={{ marginTop: 40, fontSize: 34, color: C.muted }}>
        Reproducibility isn't a feeling. <span style={{ color: C.text }}>It's a property you can test.</span>
      </Appear>
      <Appear at={b[3]} style={{ marginTop: 24 }}>
        <Chip color={A}>illustrative checksums: the real test compares every output file</Chip>
      </Appear>
    </Frame>
  );
};

export const R02: React.FC = () => {
  const b = useBeats("r02");
  return (
    <Frame chapter="Seeds">
      <H n={2} title="A seed fixes the generator's state" />
      <div style={{ marginTop: 50, width: 1100 }}>
        <Code
          title="console (real output)"
          fontSize={32}
          lines={[
            { code: "set.seed(1); sample(1:10, 3)", at: b[2], out: "[1] 9 4 7", outColor: C.emerald },
            { code: "set.seed(1); sample(1:10, 3)", at: b[2] + 2.2, out: "[1] 9 4 7", outColor: C.emerald },
          ]}
        />
      </div>
      <Appear at={b[3]} style={{ marginTop: 30 }}>
        <Chip color={C.coral}>no seed → a different bootstrap interval on every run</Chip>
      </Appear>
    </Frame>
  );
};

export const R03: React.FC = () => {
  const b = useBeats("r03");
  return (
    <Frame chapter="Generator settings">
      <H n={3} title="A seed alone isn't enough" />
      <Row style={{ marginTop: 50 }} gap={40}>
        <div style={{ width: 1100 }}>
          <Code
            title="console (real output)"
            fontSize={29}
            lines={[
              { code: "set.seed(1); sample(1:10, 3)", at: b[0] + 0.4, out: "[1] 9 4 7" },
              { code: 'RNGkind(sample.kind = "Rounding")   # pre-R 3.6 behaviour', at: b[1] + 0.4 },
              { code: "set.seed(1); sample(1:10, 3)", at: b[2], out: "[1] 3 4 5", outColor: C.coral },
            ]}
          />
        </div>
        <Appear at={b[3]} style={{ flex: 1 }}>
          <Panel style={{ padding: "24px 28px", borderColor: "rgba(251,191,36,0.45)" }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: A }}>CAN CHANGE THE SETTINGS</div>
            {["an old script", "a package", "a colleague's .Rprofile"].map((x) => (
              <div key={x} style={{ fontSize: 28, marginTop: 10 }}>• {x}</div>
            ))}
          </Panel>
        </Appear>
      </Row>
    </Frame>
  );
};

export const R04: React.FC = () => {
  const b = useBeats("r04");
  return (
    <Frame chapter="Generator settings">
      <H n={3} title="Pin everything, then restore" />
      <Row style={{ marginTop: 44 }} gap={36}>
        <div style={{ width: 1100 }}>
          <File
            name="boot_ci.R"
            at={b[0] + 0.3}
            fontSize={25}
            lines={[
              "boot_ci <- function(x, B = 2000, seed = 1) {",
              "  x <- x[!is.na(x)]",
              "  means <- withr::with_seed(seed,",
              "    replicate(B, mean(sample(x, replace = TRUE))),",
              '    .rng_kind = "Mersenne-Twister", .rng_normal_kind = "Inversion",',
              '    .rng_sample_kind = "Rejection")',
              "  c(lower = quantile(means, 0.025, names = FALSE),",
              "    upper = quantile(means, 0.975, names = FALSE))",
              "}",
            ]}
            highlight={[
              { lines: [4, 5], from: b[1], to: b[3], color: A },
              { lines: [2], from: b[3], color: C.emerald },
            ]}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Code
            title="console (real output)"
            fontSize={24}
            lines={[
              { code: "set.seed(42); before <- .Random.seed", at: b[3] + 0.6 },
              { code: "invisible(withr::with_seed(7, runif(1)))", at: b[3] + 2 },
              { code: "identical(.Random.seed, before)", at: b[3] + 3.4, out: "[1] TRUE", outColor: C.emerald },
            ]}
          />
          <Appear at={b[3] + 5} style={{ marginTop: 18 }}>
            <Chip color={C.emerald}>caller's random stream untouched</Chip>
          </Appear>
        </div>
      </Row>
    </Frame>
  );
};

export const R05: React.FC = () => {
  const b = useBeats("r05");
  return (
    <Frame chapter="Computed reporting">
      <H n={4} title="A typed number is a copy" />
      <Row style={{ marginTop: 50 }} gap={40}>
        <Appear at={b[1]} style={{ flex: 1 }}>
          <Panel title="report.qmd  ✗ pasted" style={{ borderColor: "rgba(251,113,133,0.5)" }}>
            <div style={{ padding: "20px 26px", fontSize: 30, lineHeight: 1.6 }}>
              The mean change was <span style={{ color: C.coral, fontFamily: FONT.mono }}>4.2</span> points.
              <div style={{ fontSize: 22, color: C.subtle, marginTop: 10 }}>data updated last week · sentence wasn't</div>
            </div>
          </Panel>
        </Appear>
        <Appear at={b[2]} style={{ flex: 1 }}>
          <Panel title="report.qmd  ✓ computed" style={{ borderColor: "rgba(52,211,153,0.5)" }}>
            <div style={{ padding: "20px 26px", fontSize: 30, lineHeight: 1.6 }}>
              <span style={{ fontFamily: FONT.mono, color: C.emerald }}>`r week12_sentence(week12)`</span>
              <div style={{ fontSize: 22, color: C.subtle, marginTop: 10 }}>computed every time the document renders</div>
            </div>
          </Panel>
        </Appear>
      </Row>
      <Appear at={b[3]} style={{ marginTop: 30 }}>
        <Chip color={C.emerald}>the report and the analysis can't disagree</Chip>
      </Appear>
    </Frame>
  );
};

export const R06: React.FC = () => {
  const b = useBeats("r06");
  return (
    <Frame chapter="Computed reporting">
      <H n={4} title="Build the sentence from data" />
      <Row style={{ marginTop: 40 }} gap={30}>
        <div style={{ width: 1180 }}>
          <File
            name="week12_sentence.R"
            at={b[0] + 0.3}
            fontSize={23}
            lines={[
              "week12_sentence <- function(df) {",
              "  arms <- sort(unique(df$arm))",
              "  parts <- vapply(arms, function(a) {",
              "    x <- df$change[df$arm == a & !is.na(df$change)]",
              "    n <- length(x); m <- mean(x)",
              "    h <- qt(0.975, n - 1) * sd(x) / sqrt(n)",
              '    sprintf("%s: mean change %.2f (95%% CI %.2f to %.2f; n = %d).",',
              "            a, m, m - h, m + h, n)",
              "  }, character(1))",
              '  paste(parts, collapse = " ")',
              "}",
            ]}
            highlight={[
              { lines: [3], from: b[1], to: b[1] + 2.4, color: A },
              { lines: [4, 5], from: b[1] + 2.4, to: b[1] + 5, color: A },
              { lines: [6, 7], from: b[1] + 5, to: b[2], color: A },
            ]}
          />
        </div>
      </Row>
      <Appear at={b[2]} style={{ marginTop: 22 }}>
        <Console
          title="week12_sentence(week12)  (real output, synthetic data)"
          fontSize={24}
          lines={[
            { text: "Placebo: mean change 2.19 (95% CI 0.94 to 3.44; n = 25).", color: C.emerald, at: b[2] + 0.3 },
            { text: "Treatment: mean change 1.60 (95% CI 0.71 to 2.49; n = 29).", color: C.emerald, at: b[2] + 0.9 },
          ]}
        />
      </Appear>
    </Frame>
  );
};

export const R07: React.FC = () => {
  const b = useBeats("r07");
  return (
    <Frame chapter="The analysis">
      <H n={5} title="Analysis set → primary model" />
      <Row style={{ marginTop: 40 }} gap={30}>
        <div style={{ width: 1080 }}>
          <File
            name="run_analysis.R (excerpt)"
            at={b[0] + 0.3}
            fontSize={25}
            lines={[
              "raw <- utils::read.csv(raw_path)",
              "analysis <- raw[!is.na(raw$week12), ]",
              "analysis$change <- analysis$week12 - analysis$baseline",
              'analysis$arm <- factor(analysis$arm, levels = c("Placebo", "Treatment"))',
              "fit <- stats::lm(change ~ arm + baseline, data = analysis)",
              'summary(fit)$coefficients["armTreatment", ]',
            ]}
            highlight={[
              { lines: [1, 2], from: b[1], to: b[2], color: A },
              { lines: [4], from: b[2], color: A },
            ]}
          />
        </div>
        <Appear at={b[3]} style={{ flex: 1 }}>
          <Panel title="results (real, synthetic trial)" style={{ padding: 0 }}>
            <div style={{ padding: "18px 24px", fontFamily: FONT.mono, fontSize: 26, lineHeight: 1.7 }}>
              <div>n         <span style={{ color: C.text }}>72</span></div>
              <div>estimate  <span style={{ color: C.emerald }}>-3.481</span></div>
              <div>SE        1.166</div>
              <div>95% CI    [-5.808, -1.154]</div>
              <div>p         0.0039</div>
            </div>
          </Panel>
        </Appear>
      </Row>
    </Frame>
  );
};

export const R08: React.FC = () => {
  const b = useBeats("r08");
  return (
    <Frame chapter="Byte-identical outputs">
      <H n={6} title="Every output is a file" />
      <Row style={{ marginTop: 44 }} gap={30}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            ["results.csv", "term, estimate, SE, CI, p, n", b[0] + 0.4],
            ["audit_sample.csv", '"RQ-029" "RQ-036" "RQ-040" "RQ-043" "RQ-068"', b[0] + 1.4],
            ["provenance.txt", "R version · seed · input_md5", b[0] + 2.6],
          ].map(([f, d, at]) => (
            <Appear key={f as string} at={at as number}>
              <Panel style={{ padding: "18px 24px" }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 28, color: A }}>{f}</div>
                <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.muted, marginTop: 6 }}>{d}</div>
              </Panel>
            </Appear>
          ))}
        </div>
        <div style={{ width: 760 }}>
          <Code
            title="console (real output)"
            fontSize={23}
            lines={[
              { code: "write.csv(res, f1, row.names = FALSE)", at: b[1] },
              { code: "write.csv(res, f2, row.names = FALSE)", at: b[1] + 0.8 },
              { code: "unname(tools::md5sum(f1)) == unname(tools::md5sum(f2))", at: b[1] + 1.6, out: "[1] TRUE", outColor: C.emerald },
              { code: "# add a run_at = format(Sys.time()) column", at: b[2] },
              { code: "unname(tools::md5sum(f1)) == unname(tools::md5sum(f2))", at: b[2] + 1.2, out: "[1] FALSE", outColor: C.coral },
            ]}
          />
        </div>
      </Row>
    </Frame>
  );
};

export const R09: React.FC = () => {
  const b = useBeats("r09");
  return (
    <Frame chapter="Byte-identical outputs">
      <H n={6} title="The reviewer's test" />
      <Row gap={18} style={{ marginTop: 50 }}>
        {["another directory", 'options(OutDec = ",")', 'RNGkind(sample.kind = "Rounding")'].map((x, i) => (
          <Appear key={x} at={b[0] + 0.5 + i * 0.6}>
            <Chip color={C.coral}>{x}</Chip>
          </Appear>
        ))}
      </Row>
      <div style={{ marginTop: 40, width: 1400 }}>
        <Code
          title="reviewer.R"
          fontSize={26}
          lines={[
            { code: 'run_analysis(raw_path, "run1")', at: b[0] + 2.6 },
            { code: 'run_analysis(raw_path, "run2")   # hostile session', at: b[0] + 3.4 },
            { code: 'f <- c("results.csv", "audit_sample.csv", "provenance.txt")', at: b[0] + 4.4 },
            { code: 'identical(unname(tools::md5sum(file.path("run1", f))), unname(tools::md5sum(file.path("run2", f))))', at: b[1], out: "[1] TRUE", outColor: C.emerald },
          ]}
        />
      </div>
      <Appear at={b[2]} style={{ marginTop: 24 }}>
        <Chip color={C.emerald}>every number traceable to code and data</Chip>
      </Appear>
    </Frame>
  );
};

export const R10: React.FC = () => {
  const b = useBeats("r10");
  const missions = [
    { title: "Reproducible bootstrap", xp: 80, detail: "Same interval under any RNGkind(); the caller's stream untouched", at: b[1] },
    { title: "Trace the numbers", xp: 80, detail: "A report sentence where every number is computed", at: b[2] },
    { title: "Boss: The Reviewer Re-run", xp: 300, detail: "Output files a reviewer re-creates byte-for-byte", at: b[3] },
  ];
  return (
    <Frame chapter="Your Research Mission">
      <Heading kicker="Final missions" title="Your Research Mission" color={A} />
      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 50 }}>
        {missions.map((m, i) => (
          <Appear key={m.title} at={m.at}>
            <Panel style={{ padding: "24px 32px", display: "flex", alignItems: "center", gap: 30, borderColor: i === 2 ? "rgba(251,191,36,0.55)" : C.line }}>
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
      <AbsoluteFill style={{ background: "radial-gradient(50% 45% at 50% 50%, rgba(251,191,36,0.15), transparent 70%)" }} />
      <div style={{ textAlign: "center", opacity: ease(t, 0.1, 0.8) }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LogoMark size={96} />
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 64, marginTop: 26 }}>
          Next: <span style={{ color: A }}>Reproducible bootstrap</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontSize: 28, color: C.subtle, marginTop: 20 }}>RQuest · Research Programmer Academy · all data synthetic · independent project</div>
      </div>
    </AbsoluteFill>
  );
};
