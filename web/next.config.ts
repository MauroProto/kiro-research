import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async rewrites() {
    return [
      {
        source: '/favicons/:path*',
        destination: '/api/favicon/:path*',
      },
    ];
  },
};

export default nextConfig;

