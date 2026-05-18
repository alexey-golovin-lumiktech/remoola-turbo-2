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
    files: ['src/**/*.ts'],
    ignores: ['src/shared/mailing.module.ts', 'src/shared/mailing.service.ts', 'src/shared/mailing.service.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/shared/mailing.service', '**/mailing.service'],
              importNames: ['MailingService'],
              message:
                'Inject a focused mailing service instead: SignupMailingService, RecoveryMailingService, PaymentMailingService, InvoiceMailingService, or AdminNotificationMailingService.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/main.ts', 'src/health/health.service.ts', 'src/consumer/modules/payment-methods/stripe-webhook.service.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: [
      '**/__tests__/**/*.{ts,tsx}',
      '**/?(*.)+(spec|test).{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    ignores: ['.prettierrc.mjs', 'eslint.config.mjs'],
  },
];
