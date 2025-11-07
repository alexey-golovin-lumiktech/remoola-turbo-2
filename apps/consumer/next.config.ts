import path from 'path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [`@remoola/ui`, `@remoola/database`],
  outputFileTracingRoot: path.join(__dirname, `../../`),
  allowedDevOrigins: [`localhost`, `127.0.0.1`],
  experimental: { externalDir: true },
};

export default nextConfig;
