const nf = new Intl.NumberFormat("en-US");

export const formatNumber = (n: number) => nf.format(n);

export const formatPercent = (fraction: number) =>
  `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
