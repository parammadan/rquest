import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import timeline from "../../../projects/research-mission-v1/timeline.json";
import { AbsoluteFrame, useFonts, VideoContext } from "../../kit";
import { Intro, Outro, R01, R02, R03, R04, R05, R06, R07, R08, R09, R10 } from "./scenes";

const SCENES: Record<string, React.FC> = { r01: R01, r02: R02, r03: R03, r04: R04, r05: R05, r06: R06, r07: R07, r08: R08, r09: R09, r10: R10 };
const LEAD_FRAMES = Math.round(0.6 * timeline.fps);

/** World 5 instructional video: intro, ten narrated scenes, outro. Timing comes from timeline.json. */
export const ResearchMissionLesson: React.FC = () => {
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
