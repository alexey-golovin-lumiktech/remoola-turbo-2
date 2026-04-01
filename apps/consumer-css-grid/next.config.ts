import path from 'path';

import { type NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [`@remoola/ui`],
  outputFileTracingRoot: path.join(__dirname, `../../`),
  allowedDevOrigins: [`localhost`, `127.0.0.1`, `remoola-turbo-2-api.vercel.app`],
  experimental: { externalDir: true },
  devIndicators: false,
};

export default nextConfig;
