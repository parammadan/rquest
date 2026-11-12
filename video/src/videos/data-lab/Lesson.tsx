import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import timeline from "../../../projects/data-lab-v1/timeline.json";
import { AbsoluteFrame, useFonts, VideoContext } from "../../kit";
import { Intro, Outro, S01, S02, S03, S04, S05, S06, S07, S08, S09, S10 } from "./scenes";

const SCENES: Record<string, React.FC> = { s01: S01, s02: S02, s03: S03, s04: S04, s05: S05, s06: S06, s07: S07, s08: S08, s09: S09, s10: S10 };
const LEAD_FRAMES = Math.round(0.6 * timeline.fps);

/** World 1 instructional video: intro, ten narrated scenes, outro. Timing comes from timeline.json. */
export const DataLabLesson: React.FC = () => {
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
