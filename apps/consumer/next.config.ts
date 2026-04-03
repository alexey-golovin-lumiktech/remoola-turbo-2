import path from 'path';

import { type NextConfig } from 'next';

const packages = [`sonner`, `framer-motion`, `@remoola/api-types`, `@remoola/shared-constants`, `@remoola/ui`];

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  transpilePackages: packages,
  outputFileTracingRoot: path.join(__dirname, `../../`),
  allowedDevOrigins: [`localhost`, `127.0.0.1`, `remoola-turbo-2-api.vercel.app`],
  experimental: { externalDir: true, optimizePackageImports: packages },

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

  // Turbopack (next dev --turbopack): path aliases from tsconfig are read automatically;
  // optimizePackageImports is applied by Turbopack without extra config.
  turbopack: {
    resolveExtensions: [
      `.ts`,
      `.tsx`,
      `.js`,
      `.jsx`,
      `.json`,
      `.css`,
      `.scss`,
      `.sass`,
      `.less`,
      `.svg`,
      `.png`,
      `.jpg`,
      `.jpeg`,
      `.gif`,
      `.webp`,
      `.avif`,
      `.woff`,
      `.woff2`,
      `.eot`,
      `.ttf`,
      `.otf`,
      `.md`,
      `.mdx`,
      `.graphql`,
      `.gql`,
      `.yaml`,
      `.yml`,
      `.mjs`,
      `.cjs`,
    ],
  },

  // Note: avoid custom webpack chunk overrides here.
  // Next.js already handles app-router CSS/JS chunking, and overriding splitChunks
  // can cause CSS assets to leak into the script manifest in production builds.
};

export default nextConfig;
