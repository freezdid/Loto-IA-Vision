import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module: keep it out of the server bundle so the
  // API routes can fall back gracefully on platforms without the binding.
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // TensorFlow.js is large; make sure it is only shipped where it is used.
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
