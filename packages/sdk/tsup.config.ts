import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { resolve: true },
  sourcemap: true,
  clean: true,
  target: 'node22',
  tsconfig: 'tsconfig.build.json',
  external: [
    'zod',
    'ai',
    '@ai-sdk/provider',
    '@ai-sdk/anthropic',
    '@ai-sdk/openai',
    '@ai-sdk/google',
    '@ai-sdk/xai',
    '@concierge-mantle/shared',
    '@concierge-mantle/tools',
    '@concierge-mantle/vercel-ai',
  ],
});
