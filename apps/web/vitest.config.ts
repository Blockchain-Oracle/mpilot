import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts', 'app/**/*.test.tsx'],
    // Boundary tests only — RTL component tests land alongside Playwright in
    // story-115. Keep this fast (<5s) so pre-commit hooks can run it.
  },
});
