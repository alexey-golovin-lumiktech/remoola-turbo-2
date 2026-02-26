import { nestConfig } from '@remoola/jest-config';

export default {
  ...nestConfig,
  testEnvironment: `node`,
  collectCoverage: false,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
  errorOnDeprecated: true,
  verbose: true,
  cache: false,
};
