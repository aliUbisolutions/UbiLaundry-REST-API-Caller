import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Keep bcryptjs as a real Node module instead of bundling it into the server
  // chunks, so the standalone output ships it in node_modules — required both
  // by the app's auth routes and by scripts/reset-password.mjs at runtime.
  serverExternalPackages: ['bcryptjs'],
};

export default nextConfig;
