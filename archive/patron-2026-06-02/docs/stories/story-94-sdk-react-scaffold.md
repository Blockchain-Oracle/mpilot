# Story 94 — @patron/react package scaffold (React wrapper for sdk-js)

**Epic:** Epic 6 — Checkout SDKs
**Estimated:** ~1.5h
**Depends on:** story-90-sdk-js-scaffold

## BDD Acceptance Criteria

```
Given the monorepo is installed
When `pnpm --filter @patron/react build` runs
Then exit code is 0
And dist/ contains ESM (dist/index.mjs) + CJS (dist/index.cjs) + types (dist/index.d.ts)
And the package does NOT bundle React (peerDependency)

Given a React 18 or React 19 app installs `@patron/react`
When the consumer renders `<PatronProvider config={{ merchantSlug, apiBaseUrl }}><App /></PatronProvider>`
Then a context provides the underlying `@patron/sdk-js` client to descendants
And `usePatron()` returns the client

Given the consumer does `import { PatronButton } from '@patron/react'`
When the import resolves
Then the type signature exists (button component shipped in story-95)
And no DOM code runs at import time

Given the consumer is server-rendering (Next.js RSC)
When PatronProvider is imported from a server component
Then no error — the package has `"use client"` directives at the right boundary
And the provider itself is a client component

Given the package is published
When `npm pkg get peerDependencies` runs on the published tarball
Then `react` and `react-dom` are listed with `^18 || ^19` ranges
And neither is in `dependencies`

Given Vitest runs packages/sdk-react/src/__tests__/provider.test.tsx
When the spec executes with @testing-library/react
Then PatronProvider mounts, usePatron returns the client, unmount cleans up

Given Biome runs over packages/sdk-react/
When lint runs
Then no errors
And no file exceeds 400 lines
```

## File modification map

- `packages/sdk-react/package.json` — UPDATE — `name: "@patron/react"`, `version: "0.0.0"`, `type: "module"`, `main: "./dist/index.cjs"`, `module: "./dist/index.mjs"`, `types: "./dist/index.d.ts"`, `exports: { ".": { import: "./dist/index.mjs", require: "./dist/index.cjs", types: "./dist/index.d.ts" } }`, `peerDependencies: { react: "^18 || ^19", react-dom: "^18 || ^19" }`, `dependencies: { "@patron/sdk-js": "workspace:*" }`, `publishConfig: { access: "public" }`. Scripts mirror sdk-js (build via tsup, lint, typecheck, test).
- `packages/sdk-react/tsup.config.ts` — NEW — ESM + CJS targets only (no IIFE); externalize `react`, `react-dom`, `@patron/sdk-js`; emit `.d.ts`.
- `packages/sdk-react/tsconfig.json` — NEW — extends `tsconfig.base.json`; `jsx: "preserve"`; `lib: ["DOM", "ES2022"]`.
- `packages/sdk-react/src/index.ts` — NEW — public exports: `PatronProvider`, `usePatron`, placeholder re-exports for `PatronButton` (story-95) and hooks (story-96).
- `packages/sdk-react/src/context/PatronProvider.tsx` — NEW — `"use client"`; creates the underlying sdk-js client on mount with the passed config; `useEffect` cleanup destroys the singleton on unmount.
- `packages/sdk-react/src/context/usePatron.ts` — NEW — hook returning the client from context; throws (in dev) with a helpful message if used outside provider.
- `packages/sdk-react/src/__tests__/provider.test.tsx` — NEW — Vitest + @testing-library/react covering mount, hook return, unmount.
- `packages/sdk-react/README.md` — NEW — quickstart: install + Provider + Button + hooks; link to docs site (story-97).
- `packages/sdk-react/.npmignore` — NEW — keeps source + tests out of published tarball.

## Shell verification

```bash
pnpm --filter @patron/react install
pnpm --filter @patron/react build
test $? -eq 0

# Outputs present
test -f packages/sdk-react/dist/index.mjs
test -f packages/sdk-react/dist/index.cjs
test -f packages/sdk-react/dist/index.d.ts

# Peer deps not bundled
node -e "const p=require('./packages/sdk-react/package.json'); if(!p.peerDependencies.react) process.exit(1); if(p.dependencies.react) { console.error('react must be peer, not direct'); process.exit(1) }"

# sdk-js is a dep
node -e "const p=require('./packages/sdk-react/package.json'); if(!p.dependencies['@patron/sdk-js']) process.exit(1)"

# Vitest
pnpm --filter @patron/react test
test $? -eq 0

# 400-LOC
for f in $(find packages/sdk-react/src -type f \( -name "*.ts" -o -name "*.tsx" \)); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done

pnpm --filter @patron/react lint
test $? -eq 0
```

## Notes

- **Context7 first**: query React 18/19 server-component boundaries to confirm `"use client"` placement.
- The React package is a THIN wrapper over `@patron/sdk-js`. Logic lives in sdk-js; React surface is provider + hooks + ergonomic components.
- `peerDependencies` for React (not direct dep) — standard for npm React libs to avoid duplicate React instances.
- `"use client"` boundary: PatronProvider + hooks + PatronButton are all client components. Re-export shape allows consumer apps to import them from a server component, and Next.js will hoist the client boundary correctly.
- Singleton management: PatronProvider creates ONE client per mount; if a consumer re-mounts (HMR / route change), the singleton is re-created. Multiple providers in the same app are unsupported in v1 (document this).
- `usePatron` hook is the foundation hooks build on (story-96).
- File size < 400 LOC enforced.
- Foundation for stories 95-96. Publish setup in story-98.
