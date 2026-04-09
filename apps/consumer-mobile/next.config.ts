import path from 'path';

import { type NextConfig } from 'next';

const packages = [`sonner`, `@remoola/api-types`, `@remoola/shared-constants`, `@remoola/ui`];

function normalizeOriginCandidate(candidate: string | undefined): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed === `undefined` || trimmed === `null`) return null;

  const normalizedCandidate = trimmed.includes(`://`) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(normalizedCandidate).origin;
  } catch {
    return null;
  }
}

function getConsumerCssGridCutoverOrigin(): string | null {
  if (process.env.NODE_ENV !== `production`) return null;
  if (process.env.VERCEL !== `1`) return null;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== `production`) return null;
  return normalizeOriginCandidate(process.env.CONSUMER_CSS_GRID_APP_ORIGIN);
}

function getConsumerCssGridCutoverRedirects() {
  const origin = getConsumerCssGridCutoverOrigin();
  if (!origin) return [];

  return [
    {
      source: `/`,
      destination: `${origin}/dashboard`,
      permanent: true,
    },
    {
      source: `/withdraw-transfer`,
      destination: `${origin}/withdraw`,
      permanent: true,
    },
    {
      source: `/withdraw-transfer/:path*`,
      destination: `${origin}/withdraw`,
      permanent: true,
    },
    {
      source: `/payment-methods`,
      destination: `${origin}/banking`,
      permanent: true,
    },
    {
      source: `/payment-methods/:path*`,
      destination: `${origin}/banking`,
      permanent: true,
    },
    {
      source: `/payment-requests/new`,
      destination: `${origin}/payments/new-request`,
      permanent: true,
    },
    {
      source: `/payment-requests/new/:path*`,
      destination: `${origin}/payments/new-request`,
      permanent: true,
    },
    {
      source: `/:path((?!api|_next|assets|favicon\\.ico|.*\\..*).*)`,
      destination: `${origin}/:path*`,
      permanent: true,
    },
  ];
}

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  transpilePackages: packages,
  outputFileTracingRoot: path.join(__dirname, `../../`),
  allowedDevOrigins: [`localhost`, `127.0.0.1`, `remoola-turbo-2-api.vercel.app`],
  experimental: { externalDir: true, optimizePackageImports: packages },

  poweredByHeader: false,

  images: {
    formats: [`image/webp`, `image/avif`],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: `default-src 'self'; script-src 'none'; sandbox;`,
  },

  compress: true,

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

  async redirects() {
    return getConsumerCssGridCutoverRedirects();
  },

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

  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = config.optimization.splitChunks ?? {};
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
