import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { resolve: true },
  sourcemap: true,
  clean: true,
  target: 'node22',
  tsconfig: 'tsconfig.build.json',
  external: ['@anthropic-ai/sdk', '@anthropic-ai/claude-agent-sdk', '@mpilot/sdk'],
});
