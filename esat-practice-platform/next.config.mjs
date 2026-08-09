import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce a self-contained server bundle (.next/standalone) so CI can ship a
  // minimal artifact and the VPS runs `node server.js` with no `npm install`.
  output: "standalone",
  // Pin the file-tracing root to this app dir (the app lives in a subdirectory
  // of the repo) so the standalone layout is deterministic.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
