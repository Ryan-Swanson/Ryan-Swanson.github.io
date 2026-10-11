import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Do not write AGENTS.md / CLAUDE.md into the repository during `next dev`.
  agentRules: false,
  turbopack: { root: import.meta.dirname },
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
