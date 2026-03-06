import { type Config } from 'jest';
import { config as baseConfig } from './base';

export const nestConfig = {
  ...baseConfig,
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverage: false,
  testEnvironment: 'node'
} as const satisfies Config;
