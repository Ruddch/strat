import type { NextConfig } from "next";

// Enable GitHub Pages pathing only when explicitly requested
const isGitHubPages = process.env.NEXT_PUBLIC_GH_PAGES === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  ...(isGitHubPages ? { basePath: '/strat', assetPrefix: '/strat/' } : {}),
};

export default nextConfig;
