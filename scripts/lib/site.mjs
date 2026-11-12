// Starts the site under test.
// - Default: serves the static export in out/ under BASE_PATH (like GitHub Pages).
// - SITE_URL=https://… : tests an already-deployed site instead (e.g. production).
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
  ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".vtt": "text/vtt; charset=utf-8",
  ".mp4": "video/mp4", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json",
};

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/rquest";

export async function startSite(port) {
  if (process.env.SITE_URL) return { base: process.env.SITE_URL.replace(/\/$/, ""), stop: () => {}, remote: true };
  const root = new URL("../../out/", import.meta.url).pathname;
  if (!existsSync(root)) throw new Error("out/ not found — run `pnpm build` first");
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (!url.pathname.startsWith(BASE_PATH + "/") && url.pathname !== BASE_PATH) {
      res.writeHead(404).end("not under base path");
      return;
    }
    let rel = decodeURIComponent(url.pathname.slice(BASE_PATH.length)) || "/";
    let file = normalize(join(root, rel));
    if (!file.startsWith(root)) return res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!rel.endsWith("/")) {
        res.writeHead(301, { Location: url.pathname + "/" + url.search }).end();
        return;
      }
      file = join(file, "index.html");
    }
    if (!existsSync(file)) {
      res.writeHead(404, { "Content-Type": TYPES[".html"] });
      createReadStream(join(root, "404.html")).pipe(res);
      return;
    }
    const size = statSync(file).size;
    const type = TYPES[extname(file)] ?? "application/octet-stream";
    const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Number(range[2]) : size - 1;
      res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1 });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes" });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  return { base: `http://localhost:${port}${BASE_PATH}`, stop: () => server.close(), remote: false };
}

/** Matches a site path with or without the trailing slash Pages adds. */
export function pathRe(base, path) {
  const esc = (base + path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\/$/, "");
  return new RegExp(`^${esc}/?$`);
}
