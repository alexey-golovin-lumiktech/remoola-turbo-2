import { config as baseConfig } from '@remoola/jest-config/base';
import type { Config } from 'jest';

export default {
  ...baseConfig,
  rootDir: 'src',
  testEnvironment: 'node',
  testRegex: '.*\\.test\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
} satisfies Config;
