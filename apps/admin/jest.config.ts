import { type Config } from 'jest';

import { config as baseConfig } from '@remoola/jest-config/base';

const config: Config = {
  ...baseConfig,
  roots: [`<rootDir>/src`],
  testRegex: `.*\\.test\\.ts$`,
  moduleFileExtensions: [`js`, `jsx`, `ts`, `tsx`, `json`],
  transform: {
    '^.+\\.(t|j)sx?$': [
      `ts-jest`,
      {
        tsconfig: {
          jsx: `react-jsx`,
        },
      },
    ],
  },
  verbose: true,
  collectCoverage: false,
  cache: false,
  testEnvironment: `node`,
};

export default config;
