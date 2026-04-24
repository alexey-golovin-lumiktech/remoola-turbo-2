// @ts-ignore - eslint config package currently ships JS-only subpath exports.
import { nestJsConfig } from '@remoola/eslint-config/nest-js';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nestJsConfig,
  {
    files: [`scripts/**/*.js`, `eslint.config.mjs`],
    languageOptions: {
      sourceType: `commonjs`,
      parserOptions: {
        projectService: false,
      },
    },
  },
];
