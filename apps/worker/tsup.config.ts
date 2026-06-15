import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  // No DTS — apps/worker is a runnable, not a library. Skip declaration
  // generation to keep the build fast and avoid library-only tsconfig nags.
  sourcemap: true,
  clean: true,
  target: 'node22',
  tsconfig: 'tsconfig.build.json',
  external: ['@mpilot/agent', '@mpilot/sdk', 'bullmq', 'ioredis', 'pino'],
});
