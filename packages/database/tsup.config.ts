import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [`src/index.ts`],
  format: [`cjs`], // ✅ Fixes the "import.meta" warning
  target: `es2020`,
  sourcemap: true,
  clean: true,
  watch: process.env.NODE_ENV === `development`,
});
