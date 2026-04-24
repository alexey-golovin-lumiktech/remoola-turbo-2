import nextConfig from '@remoola/jest-config/next';

const createNextConfig =
  typeof nextConfig === `function` ? nextConfig : (nextConfig as unknown as { default: () => Promise<object> }).default;

export default async () => {
  const config = await createNextConfig();
  return {
    ...config,
    setupFiles: [`<rootDir>/src/test/jest.setup.ts`],
    verbose: true,
    collectCoverage: false,
    cache: false,
    testEnvironment: `node`,
    roots: [`<rootDir>/src`],
    moduleNameMapper: {
      ...((config as { moduleNameMapper?: Record<string, string> }).moduleNameMapper ?? {}),
      'next/font/(.*)': `<rootDir>/src/test/next-font-google-mock.ts`,
      '@next/font/(.*)': `<rootDir>/src/test/next-font-google-mock.ts`,
    },
  };
};
