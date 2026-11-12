import { Composition } from "remotion";
import timeline from "../timeline.json";
import { DataLabLesson } from "./DataLabLesson";

export const RemotionRoot = () => (
  <Composition
    id="DataLabLesson"
    component={DataLabLesson}
    durationInFrames={timeline.totalFrames}
    fps={timeline.fps}
    width={1920}
    height={1080}
  />
);
