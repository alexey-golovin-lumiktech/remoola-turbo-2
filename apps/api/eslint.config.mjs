import { nestJsConfig } from '@remoola/eslint-config/nest-js';

/** @type {import("eslint").Linter.Config} */
export default [
  ...nestJsConfig,
  {
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
  {
    files: ['src/main.ts', 'src/health/health.service.ts', 'src/consumer/modules/payment-methods/stripe-webhook.service.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: ['.prettierrc.mjs', 'eslint.config.mjs'],
  },
];
