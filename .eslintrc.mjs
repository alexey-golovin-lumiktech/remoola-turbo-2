import { libraryConfig } from "@repo/eslint-config/library";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["apps/**", "packages/**", "dist/**", "node_modules/**"],
  },
  ...libraryConfig,
  {
    parser: tsParser,
    parserOptions: {
      project: true,
    },
  },
  {
    rules: {
      // add override for any (a metric ton of them, initial conversion)
      "@typescript-eslint/no-explicit-any": "off",
      // we generally use this in isFunction, not via calling
      "@typescript-eslint/unbound-method": "off",
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
    },
  },
];
