import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import timeline from "../../../projects/quality-control-v1/timeline.json";
import { AbsoluteFrame, useFonts, VideoContext } from "../../kit";
import { Intro, Outro, Q01, Q02, Q03, Q04, Q05, Q06, Q07, Q08, Q09, Q10 } from "./scenes";

const SCENES: Record<string, React.FC> = { q01: Q01, q02: Q02, q03: Q03, q04: Q04, q05: Q05, q06: Q06, q07: Q07, q08: Q08, q09: Q09, q10: Q10 };
const LEAD_FRAMES = Math.round(0.6 * timeline.fps);

/** World 4 instructional video: intro, ten narrated scenes, outro. Timing comes from timeline.json. */
export const QualityControlLesson: React.FC = () => {
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
