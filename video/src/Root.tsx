import { Composition } from "remotion";
import dataLab from "../projects/data-lab-v1/timeline.json";
import { DataLabLesson } from "./videos/data-lab/Lesson";
import packageFactory from "../projects/package-factory-v1/timeline.json";
import { PackageFactoryLesson } from "./videos/package-factory/Lesson";

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
  </>
);
