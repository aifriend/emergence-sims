import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lean self-contained server for Cloud Run (copies only needed deps).
  output: "standalone",
};

export default nextConfig;
