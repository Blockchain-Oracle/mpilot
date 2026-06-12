import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  dbCredentials: {
    // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket notation
    url: process.env['DATABASE_URL'] ?? 'postgresql://localhost:5432/concierge_dev',
  },
  strict: true,
  verbose: true,
});
