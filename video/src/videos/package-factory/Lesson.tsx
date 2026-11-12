import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import timeline from "../../../projects/package-factory-v1/timeline.json";
import { AbsoluteFrame, useFonts, VideoContext } from "../../kit";
import { Intro, Outro, P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12, P13, P14 } from "./scenes";

const SCENES: Record<string, React.FC> = { p01: P01, p02: P02, p03: P03, p04: P04, p05: P05, p06: P06, p07: P07, p08: P08, p09: P09, p10: P10, p11: P11, p12: P12, p13: P13, p14: P14 };
const LEAD_FRAMES = Math.round(0.6 * timeline.fps);

/** World 2 instructional video: intro, fourteen narrated scenes, outro. Timing comes from timeline.json. */
export const PackageFactoryLesson: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const introFrames = Math.round(timeline.intro * timeline.fps);
  const last = timeline.segments[timeline.segments.length - 1];
  const outroStart = last.startFrame + last.frames;
  return (
    <VideoContext.Provider value={timeline}>
    <AbsoluteFrame.Provider value={frame}>
      <AbsoluteFill style={{ background: "#04060b" }}>
        <Sequence durationInFrames={introFrames}>
          <Intro />
        </Sequence>
        {timeline.segments.map((s) => {
          const Scene = SCENES[s.id];
          return (
            <Sequence key={s.id} from={s.startFrame} durationInFrames={s.frames}>
              <Scene />
              <Sequence from={LEAD_FRAMES}>
                <Audio src={staticFile(`projects/${timeline.videoId}/audio/${s.id}.mp3`)} />
              </Sequence>
            </Sequence>
          );
        })}
        <Sequence from={outroStart}>
          <Outro />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFrame.Provider>
    </VideoContext.Provider>
  );
};
