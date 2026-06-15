import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/web.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node22',
  tsconfig: 'tsconfig.build.json',
});
