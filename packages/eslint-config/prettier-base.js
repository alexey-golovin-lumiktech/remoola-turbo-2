/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
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
};

export default config;
