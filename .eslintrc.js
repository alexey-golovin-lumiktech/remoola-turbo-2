module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: [`import`, `simple-import-sort`, '@typescript-eslint/eslint-plugin', 'prettier'],
  settings: {
    'import/resolver': {
      node: { paths: [`src`], extensions: [`.js`, `.jsx`, `.ts`, `.tsx`] },
    },
  },
  extends: [
    `plugin:import/recommended`,
    `plugin:import/typescript`,
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    'quotes': ['error', 'backtick'],
    '@typescript-eslint/semi': ['error', 'never'],
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-types': 'off',
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
    'simple-import-sort/exports': `error`,
    'import/newline-after-import': [`error`, { count: 1 }],
    'import/namespace': [2, { allowComputed: true }],
    'prettier/prettier': [
      'error', {
        semi: false,
        printWidth: 140,
        trailingComma: 'none',
        singleQuote: true
      }
    ]
  },
};
