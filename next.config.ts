import type { NextConfig } from "next";

// JUNI_STATIC_EXPORT=1 builds a static copy of the front-end (out/) for hosting without a server.
const staticExport = process.env.JUNI_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // Hosts that reserve top-level "_" names get the scripts under /assets/_next/ instead (see scripts/export-site.sh).
  ...(staticExport ? { output: "export" as const, trailingSlash: true, assetPrefix: "/assets" } : {}),
  // Partial prerendering needs a server, so the static export turns it off.
  cacheComponents: !staticExport,
  partialPrefetching: !staticExport,
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
