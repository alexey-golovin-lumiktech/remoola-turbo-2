import { nestConfig } from '@remoola/jest-config';

export default {
  ...nestConfig,
  testEnvironment: `node`,
  setupFilesAfterEnv: [`<rootDir>/test/jest.setup.ts`],
  collectCoverage: false,
  maxWorkers: 1,
  forceExit: false,
  detectOpenHandles: true,
  errorOnDeprecated: true,
  verbose: true,
  cache: false,
};
