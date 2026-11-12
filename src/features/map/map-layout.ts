import type { MissionId } from "@/domain/types";

/**
 * Node coordinates in SVG viewBox units. Two layouts: a wide adventure map
 * for tablet/desktop and a vertical trail for phones. Purely presentational.
 */
export interface MapLayout {
  width: number;
  height: number;
  nodes: Record<MissionId, { x: number; y: number; labelSide: "below" | "above" | "left" | "right" }>;
}

export const WIDE_LAYOUT: MapLayout = {
  width: 1000,
  height: 580,
  nodes: {
    "data-lab": { x: 120, y: 410, labelSide: "below" },
    "package-factory": { x: 320, y: 215, labelSide: "above" },
    "debugging-crisis": { x: 515, y: 405, labelSide: "below" },
    "quality-control": { x: 705, y: 200, labelSide: "above" },
    "research-mission": { x: 865, y: 375, labelSide: "below" },
  },
};

export const TALL_LAYOUT: MapLayout = {
  width: 360,
  height: 1040,
  nodes: {
    "data-lab": { x: 96, y: 110, labelSide: "right" },
    "package-factory": { x: 262, y: 310, labelSide: "left" },
    "debugging-crisis": { x: 96, y: 520, labelSide: "right" },
    "quality-control": { x: 262, y: 725, labelSide: "left" },
    "research-mission": { x: 150, y: 930, labelSide: "right" },
  },
};

/** Smooth S-curve between two points, bending along the dominant axis. */
export function pathBetween(
  a: { x: number; y: number },
  b: { x: number; y: number },
  orientation: "wide" | "tall",
): string {
  if (orientation === "wide") {
    const mx = (a.x + b.x) / 2;
    return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
  }
  const my = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
}
