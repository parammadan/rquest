import { C } from "../../kit";
import { makeDebrief, type Seg } from "./Debrief";
import dataLabT from "../../../projects/data-lab-debrief-v1/timeline.json";
import dataLabS from "../../../projects/data-lab-debrief-v1/solution.json";
import packageFactoryT from "../../../projects/package-factory-debrief-v1/timeline.json";
import packageFactoryS from "../../../projects/package-factory-debrief-v1/solution.json";
import debuggingCrisisT from "../../../projects/debugging-crisis-debrief-v1/timeline.json";
import debuggingCrisisS from "../../../projects/debugging-crisis-debrief-v1/solution.json";
import qualityControlT from "../../../projects/quality-control-debrief-v1/timeline.json";
import qualityControlS from "../../../projects/quality-control-debrief-v1/solution.json";
import researchMissionT from "../../../projects/research-mission-debrief-v1/timeline.json";
import researchMissionS from "../../../projects/research-mission-debrief-v1/solution.json";

type T = Parameters<typeof makeDebrief>[0];
const tl = (t: unknown) => t as T & { segments: Seg[] };

/** Boss debriefs: one per world, unlocked in the app after that boss is cleared. */
export const DEBRIEFS = [
  { id: "DataLabDebrief", timeline: tl(dataLabT), component: makeDebrief(tl(dataLabT), { boss: "The Messy Export", accent: C.cyan, code: dataLabS.code }) },
  { id: "PackageFactoryDebrief", timeline: tl(packageFactoryT), component: makeDebrief(tl(packageFactoryT), { boss: "Ship labtools 0.1.0", accent: C.violet, code: packageFactoryS.code }) },
  { id: "DebuggingCrisisDebrief", timeline: tl(debuggingCrisisT), component: makeDebrief(tl(debuggingCrisisT), { boss: "Works On My Machine", accent: C.coral, code: debuggingCrisisS.code }) },
  { id: "QualityControlDebrief", timeline: tl(qualityControlT), component: makeDebrief(tl(qualityControlT), { boss: "Independent QC", accent: C.emerald, code: qualityControlS.code }) },
  { id: "ResearchMissionDebrief", timeline: tl(researchMissionT), component: makeDebrief(tl(researchMissionT), { boss: "The Reviewer Re-run", accent: C.gold, code: researchMissionS.code }) },
];
