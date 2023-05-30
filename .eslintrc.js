module.exports = {
  parser: `@typescript-eslint/parser`,
  parserOptions: {
    project: `tsconfig.json`,
    tsconfigRootDir: __dirname,
    sourceType: `module`,
  },
  plugins: [`@typescript-eslint/eslint-plugin`, `simple-import-sort`],
  extends: [`plugin:@typescript-eslint/recommended`, `plugin:prettier/recommended`],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  rules: {
    quotes: [`error`, `backtick`],
    '@typescript-eslint/interface-name-prefix': `off`,
    '@typescript-eslint/explicit-function-return-type': `off`,
    '@typescript-eslint/explicit-module-boundary-types': `off`,
    '@typescript-eslint/no-explicit-any': `off`,
    '@typescript-eslint/no-unused-vars': [`error`, { ignoreRestSiblings: true }],
    '@typescript-eslint/semi': [`error`, `never`],
    '@typescript-eslint/ban-types': `off`,
    'no-restricted-imports': `off`,
    'simple-import-sort/imports': [
      `error`,
      {
        groups: [
          [`^react`, `^@?\\w`], // Packages "react" related packages come first.
          [`^(@|components)(/.*|$)`], // Internal packages.
          [`^\\u0000`], // Side effect imports.
          [`^\\.\\.(?!/?$)`, `^\\.\\./?$`], // Parent imports. Put ".." last.
          [`^\\./(?=.*/)(?!/?$)`, `^\\.(?!/?$)`, `^\\./?$`], // Other relative imports. Put same-folder imports and "." last.
          [`^.+\\.?(css)$`], // Style imports.
        ],
      },
    ],
    'prettier/prettier': [
      `error`,
      {
        trailingComma: `all`,
        singleQuote: true,
        tabWidth: 2,
        endOfLine: `auto`,
        printWidth: 140,
        semi: false,
        arrowParens: `avoid`,
        proseWrap: `preserve`,
      },
    ],
  },
}
