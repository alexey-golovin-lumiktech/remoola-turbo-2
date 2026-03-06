import { type Config } from 'jest';

import { config as baseConfig } from '@remoola/jest-config/base';

const config: Config = {
  ...baseConfig,
  roots: [`<rootDir>/src`],
  testRegex: `.*\\.test\\.ts$`,
  transform: {
    '^.+\\.(t|j)s$': `ts-jest`,
  },
  verbose: true,
  collectCoverage: false,
  cache: false,
  testEnvironment: `node`,
};

export default config;
