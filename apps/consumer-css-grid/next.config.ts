import path from 'path';

import { type NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [`@remoola/ui`],
  outputFileTracingRoot: path.join(__dirname, `../../`),
  allowedDevOrigins: [`localhost`, `127.0.0.1`, `remoola-turbo-2-api.vercel.app`],
  experimental: { externalDir: true },
  devIndicators: false,
  async redirects() {
    return [
      {
        source: `/withdraw-transfer`,
        destination: `/withdraw`,
        permanent: true,
      },
      {
        source: `/withdraw-transfer/:path*`,
        destination: `/withdraw`,
        permanent: true,
      },
      {
        source: `/payment-methods`,
        destination: `/banking`,
        permanent: true,
      },
      {
        source: `/payment-methods/:path*`,
        destination: `/banking`,
        permanent: true,
      },
      {
        source: `/payment-requests/new`,
        destination: `/payments/new-request`,
        permanent: true,
      },
      {
        source: `/payment-requests/new/:path*`,
        destination: `/payments/new-request`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
