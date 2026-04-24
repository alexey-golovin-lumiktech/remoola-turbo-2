import { nextJsConfig } from '@remoola/eslint-config/next-js';

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    files: [`src/**/*.{ts,tsx}`],
    rules: {
      'max-len': [`error`, { code: 500 }],
      'no-restricted-imports': [
        `error`,
        {
          patterns: [
            {
              group: [`**/apps/admin/**`, `**/apps/consumer/**`, `**/apps/api/**`],
              message: `No cross-app imports.`,
            },
          ],
        },
      ],
    },
  },
  {
    // next/font loaders statically analyze their arguments and reject template
    // literals. Disable the backtick quotes rule for files that import them so
    // autofix-on-save cannot reintroduce the build error.
    files: [`src/app/layout.tsx`, `src/app/**/layout.tsx`],
    rules: {
      quotes: `off`,
    },
  },
];
