import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: process.env.DIST_DIR || "out",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Base path can be configured for deployment
  basePath: process.env.BASE_PATH || "",
  env: {
    PORTAL_DATA_DIR: process.env.PORTAL_DATA_DIR || "./data",
    PROJECT_NAME: process.env.PROJECT_NAME || "Documentation",
  },
};

export default nextConfig;
