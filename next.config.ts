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
    // Explicit project root — required for dev in nested dirs and safe for
    // standalone Docker builds (root points at the app, not the host cwd)
    root: import.meta.dirname,
  },
  // Increase body size limit for API routes that receive base64 images
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
