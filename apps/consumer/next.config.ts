import path from 'path';

import { type NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [`@remoola/ui`],
  outputFileTracingRoot: path.join(__dirname, `../../`),
  allowedDevOrigins: [`localhost`, `127.0.0.1`, `remoola-turbo-2-api.vercel.app`],
  experimental: {
    externalDir: true,
    optimizePackageImports: [`lucide-react`, `framer-motion`, `@remoola/ui`],
  },

  // Performance optimizations
  poweredByHeader: false,

  // Image optimization
  images: {
    formats: [`image/webp`, `image/avif`],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: `default-src 'self'; script-src 'none'; sandbox;`,
  },

  // Compression
  compress: true,

  // Headers for better caching and security
  async headers() {
    return [
      {
        source: `/api/(.*)`,
        headers: [
          {
            key: `Cache-Control`,
            value: `no-cache, no-store, must-revalidate`,
          },
        ],
      },
      {
        source: `/_next/static/(.*)`,
        headers: [
          {
            key: `Cache-Control`,
            value: `public, max-age=31536000, immutable`,
          },
        ],
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: `vendors`,
          chunks: `all`,
          priority: 10,
        },
        ui: {
          test: /[\\/]node_modules[\\/]@remoola[\\/]ui[\\/]/,
          name: `ui-components`,
          chunks: `all`,
          priority: 20,
        },
      };
    }

    return config;
  },
};

export default nextConfig;
