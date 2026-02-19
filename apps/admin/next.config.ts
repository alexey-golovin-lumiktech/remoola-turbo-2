import path from 'path';

import { type NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [`@remoola/ui`],
  outputFileTracingRoot: path.join(__dirname, `../../`),
  allowedDevOrigins: [`localhost`, `127.0.0.1`, `remoola-turbo-2-api.vercel.app`],
  experimental: { externalDir: true },

  // Performance optimizations (compress is enabled by default in Next.js 15)
  compress: true,

  // Image optimization
  images: {
    formats: [`image/webp`, `image/avif`],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: `default-src 'self'; script-src 'none'; sandbox;`,
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: `/(.*)`,
        headers: [
          {
            key: `X-Frame-Options`,
            value: `DENY`,
          },
          {
            key: `X-Content-Type-Options`,
            value: `nosniff`,
          },
          {
            key: `Referrer-Policy`,
            value: `strict-origin-when-cross-origin`,
          },
          {
            key: `Permissions-Policy`,
            value: `camera=(), microphone=(), geolocation=(), payment=()`,
          },
          {
            key: `X-DNS-Prefetch-Control`,
            value: `on`,
          },
          {
            key: `Strict-Transport-Security`,
            value: `max-age=31536000; includeSubDomains`,
          },
        ],
      },
      {
        // Additional headers for API routes
        source: `/api/(.*)`,
        headers: [
          {
            key: `Cache-Control`,
            value: `no-cache, no-store, must-revalidate`,
          },
          {
            key: `Pragma`,
            value: `no-cache`,
          },
          {
            key: `Expires`,
            value: `0`,
          },
        ],
      },
    ];
  },

  // Note: Webpack config removed for Turbopack compatibility
  // Bundle analysis can be enabled by setting ANALYZE=true and using webpack build
};

export default nextConfig;
