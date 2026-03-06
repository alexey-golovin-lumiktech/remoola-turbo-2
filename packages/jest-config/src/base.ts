import { type Config } from 'jest';

export const config = {
  collectCoverage: false,
  moduleFileExtensions: ['js', 'ts', 'json'],
  testEnvironment: 'jsdom',
  cache: false,
} as const satisfies Config;
