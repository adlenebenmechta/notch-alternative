import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  ...(process.env.NODE_ENV === "production"
    ? {}
    : {
        turbopack: {
          // Dev-only: current working directory (breaks standalone Docker runtime)
          root: process.cwd(),
        },
      }),
  // Increase body size limit for API routes that receive base64 images
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
