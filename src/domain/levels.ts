export interface LevelDefinition {
  level: number;
  title: string;
  /** Total XP required to reach this level. */
  minXp: number;
}

export const LEVELS: readonly LevelDefinition[] = [
  { level: 1, title: "Research Intern", minXp: 0 },
  { level: 2, title: "Data Wrangler", minXp: 150 },
  { level: 3, title: "Package Artisan", minXp: 400 },
  { level: 4, title: "Debugging Specialist", minXp: 750 },
  { level: 5, title: "Quality Steward", minXp: 1200 },
  { level: 6, title: "Reproducibility Lead", minXp: 1800 },
  // Reachable: the academy awards 2,100 XP (1,800 from challenges, 300 from lessons).
  { level: 7, title: "Principal Research Programmer", minXp: 2000 },
];

export interface LevelInfo {
  level: number;
  title: string;
  totalXp: number;
  levelMinXp: number;
  /** null at the maximum level. */
  nextLevelXp: number | null;
  nextLevelTitle: string | null;
  xpIntoLevel: number;
  xpNeededForNext: number | null;
  /** 0..1 progress toward the next level (1 at max level). */
  fraction: number;
}

export function levelForXp(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].minXp) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const span = next ? next.minXp - current.minXp : 0;
  const into = xp - current.minXp;
  return {
    level: current.level,
    title: current.title,
    totalXp: xp,
    levelMinXp: current.minXp,
    nextLevelXp: next?.minXp ?? null,
    nextLevelTitle: next?.title ?? null,
    xpIntoLevel: into,
    xpNeededForNext: next ? next.minXp - xp : null,
    fraction: next ? into / span : 1,
  };
}
