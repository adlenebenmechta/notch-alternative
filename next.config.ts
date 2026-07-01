import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  turbopack: {
    // Use current working directory (works in both local dev and Docker/Railway)
    root: process.cwd(),
  },
};

export default nextConfig;
