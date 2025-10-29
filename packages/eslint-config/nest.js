import globals from "globals";
import { config as baseConfig } from "./base.js";
import importPlugin from "eslint-plugin-import";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

/**
 * A custom ESLint configuration for Nest.js.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const nestJsConfig = [
  ...baseConfig,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'no-duplicate-imports': ['error', { includeExports: true }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "quotes": ["error", "backtick"],
      "max-len": ["error", { code: 120, ignoreUrls: true }],

      // 🧹 Spacing rules
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0, maxBOF: 0 }],

      // 🧭 Import order
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
            "object",
            "type",
          ],
          pathGroups: [
            { pattern: "@remoola/**", group: "internal", position: "before" },
            { pattern: "@/**", group: "internal", position: "before" },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          alphabetize: { order: "asc", caseInsensitive: true },
          "newlines-between": "always",
        },
      ],

      // 💅 Prettier
      "prettier/prettier": [
        "error",
        {
          $schema: "https://json.schemastore.org/prettierrc",
          semi: true,
          singleQuote: true,
          trailingComma: "all",
          printWidth: 120,
          tabWidth: 2,
          arrowParens: "always",
          bracketSpacing: true,
          endOfLine: "lf",
          proseWrap: "preserve",
          quoteProps: "as-needed",
          jsxSingleQuote: false
        },
      ],
    }
  },
];
