/** Prefix a public/ asset path with the deployment base path (e.g. GitHub Pages "/rquest"). */
export function asset(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
