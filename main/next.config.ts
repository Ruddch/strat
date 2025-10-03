import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Настройки для GitHub Pages
  basePath: '/strat',
  assetPrefix: '/strat/',
};

export default nextConfig;
