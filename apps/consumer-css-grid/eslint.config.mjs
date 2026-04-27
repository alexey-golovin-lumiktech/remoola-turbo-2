import { nextJsConfig } from '@remoola/eslint-config/next-js';

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'max-len': ['error', { code: 500 }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/admin-v2/**', '**/apps/api-v2/**'],
              message: 'No cross-app imports.',
            },
          ],
        },
      ],
    },
  },
];
