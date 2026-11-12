import type { NextConfig } from "next";

/**
 * Static export for GitHub Pages. All learner state lives in the browser,
 * and R runs client-side (webR), so no server is needed.
 * NEXT_PUBLIC_BASE_PATH is the Pages project path (e.g. "/rquest"); empty for local dev.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
