import { Composition } from "remotion";
import dataLab from "../projects/data-lab-v1/timeline.json";
import { DataLabLesson } from "./videos/data-lab/Lesson";
import packageFactory from "../projects/package-factory-v1/timeline.json";
import { PackageFactoryLesson } from "./videos/package-factory/Lesson";
import debuggingCrisis from "../projects/debugging-crisis-v1/timeline.json";
import { DebuggingCrisisLesson } from "./videos/debugging-crisis/Lesson";
import qualityControl from "../projects/quality-control-v1/timeline.json";
import { QualityControlLesson } from "./videos/quality-control/Lesson";
import researchMission from "../projects/research-mission-v1/timeline.json";
import { ResearchMissionLesson } from "./videos/research-mission/Lesson";

/** One composition per video project (projects/<id>/). */
export const RemotionRoot = () => (
  <>
    <Composition id="DataLabLesson" component={DataLabLesson} durationInFrames={dataLab.totalFrames} fps={dataLab.fps} width={1920} height={1080} />
    <Composition
      id="PackageFactoryLesson"
      component={PackageFactoryLesson}
      durationInFrames={packageFactory.totalFrames}
      fps={packageFactory.fps}
      width={1920}
      height={1080}
    />
    <Composition id="DebuggingCrisisLesson" component={DebuggingCrisisLesson} durationInFrames={debuggingCrisis.totalFrames} fps={debuggingCrisis.fps} width={1920} height={1080} />
    <Composition id="QualityControlLesson" component={QualityControlLesson} durationInFrames={qualityControl.totalFrames} fps={qualityControl.fps} width={1920} height={1080} />
    <Composition id="ResearchMissionLesson" component={ResearchMissionLesson} durationInFrames={researchMission.totalFrames} fps={researchMission.fps} width={1920} height={1080} />
  </>
);
