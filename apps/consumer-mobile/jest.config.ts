import nextConfig from '@remoola/jest-config/next';

const createNextConfig =
  typeof nextConfig === `function` ? nextConfig : (nextConfig as unknown as { default: () => Promise<object> }).default;

export default async () => {
  const config = await createNextConfig();
  return {
    ...config,
    testEnvironment: `node`,
    roots: [`<rootDir>/src`],
  };
};
