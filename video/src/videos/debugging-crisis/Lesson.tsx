import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import timeline from "../../../projects/debugging-crisis-v1/timeline.json";
import { AbsoluteFrame, useFonts, VideoContext } from "../../kit";
import { Intro, Outro, D01, D02, D03, D04, D05, D06, D07, D08, D09, D10, D11 } from "./scenes";

const SCENES: Record<string, React.FC> = { d01: D01, d02: D02, d03: D03, d04: D04, d05: D05, d06: D06, d07: D07, d08: D08, d09: D09, d10: D10, d11: D11 };
const LEAD_FRAMES = Math.round(0.6 * timeline.fps);

/** World 3 instructional video: intro, eleven narrated scenes, outro. Timing comes from timeline.json. */
export const DebuggingCrisisLesson: React.FC = () => {
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
