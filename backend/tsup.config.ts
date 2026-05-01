import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/app.ts'],
  format: ['esm'],
  dts: true,
  outDir: 'dist',
  clean: true,
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
});
