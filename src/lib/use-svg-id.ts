import { useId } from "react";

/**
 * Unique, URL-safe id for SVG <defs>. Fixed ids break when the same graphic
 * is rendered twice (responsive duplicates, routes hidden by <Activity>):
 * url(#id) resolves to the first match, which may be display:none.
 */
export function useSvgId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
