# Story 90 — @patron/sdk-js package scaffold (tsup, ESM + CJS + UMD)

**Epic:** Epic 6 — Checkout SDKs
**Estimated:** ~1.5h
**Depends on:** story-00-monorepo-scaffold, story-02-typescript-config

## BDD Acceptance Criteria

```
Given the monorepo is installed
When `pnpm --filter @patron/sdk-js build` runs
Then exit code is 0
And dist/ contains all three outputs:
  - dist/index.mjs (ESM)
  - dist/index.cjs (CommonJS)
  - dist/index.global.js (UMD/IIFE for <script src=…> use)
And dist/index.d.ts is emitted with full type definitions

Given a merchant adds `<script src="https://cdn.jsdelivr.net/npm/@patron/sdk-js@<ver>/dist/index.global.js"></script>` to their HTML
When the page loads
Then `window.Patron` is defined
And `window.Patron.version` returns the package version string
And no global side effects fire until the merchant calls `window.Patron.init({...})`

Given a Node/ESM consumer does `import { PatronCheckout } from '@patron/sdk-js'`
When the import resolves
Then the type signature `PatronCheckout` is available
And no DOM-only code runs at import time (server-safe)

Given a consumer calls `Patron.init({ merchantSlug: 'threads-by-mara', apiBaseUrl: 'https://api.patron.xyz' })`
When the init runs
Then a singleton PatronClient is created
And subsequent calls return the same instance (idempotent init logs a warning)

Given Vitest runs packages/sdk-js/src/__tests__/init.test.ts
When the spec executes
Then `Patron.init` + `version` + idempotency are all asserted

Given Biome runs over packages/sdk-js/
When `pnpm --filter @patron/sdk-js lint` executes
Then no errors
And no file exceeds 400 lines
```

## File modification map

- `packages/sdk-js/package.json` — UPDATE — `name: "@patron/sdk-js"`, `version: "0.0.0"`, `type: "module"`, `main: "./dist/index.cjs"`, `module: "./dist/index.mjs"`, `types: "./dist/index.d.ts"`, `exports: { ".": { import: "./dist/index.mjs", require: "./dist/index.cjs", types: "./dist/index.d.ts" }, "./global": "./dist/index.global.js" }`, `unpkg: "./dist/index.global.js"`, `jsdelivr: "./dist/index.global.js"`, `publishConfig: { access: "public" }`, `files: ["dist", "README.md"]`. Scripts: `build` (tsup), `dev` (tsup --watch), `lint`, `typecheck`, `test`.
- `packages/sdk-js/tsup.config.ts` — NEW — three build targets: ESM, CJS, IIFE (global name `Patron`); emit `.d.ts`; tree-shakeable; no external deps in IIFE bundle.
- `packages/sdk-js/tsconfig.json` — NEW — extends `tsconfig.base.json`; `lib: ["DOM", "ES2022"]`; `moduleResolution: "Bundler"`.
- `packages/sdk-js/src/index.ts` — NEW — public API surface; exports `init`, `PatronCheckout` (placeholder class wired in stories 91-93), `version`. Detects browser vs node via `typeof window !== 'undefined'`.
- `packages/sdk-js/src/client/PatronClient.ts` — NEW — singleton manager; holds `{ merchantSlug, apiBaseUrl, theme?, env? }` config; methods `init`, `getConfig`, `assertReady`.
- `packages/sdk-js/src/lib/version.ts` — NEW — generated at build (reads from package.json via tsup `injectStyle: false`, define replacement).
- `packages/sdk-js/src/types.ts` — NEW — public TS interfaces: `PatronConfig`, `PatronOrderIntent`, `PatronCheckoutResult`. NO `any` — use `unknown` + narrowing.
- `packages/sdk-js/src/__tests__/init.test.ts` — NEW — Vitest covering init + idempotency + version.
- `packages/sdk-js/README.md` — NEW — quickstart: script tag usage + npm usage + link to docs site (story-97).
- `packages/sdk-js/.npmignore` — NEW — keeps source + tests out of published tarball.

## Shell verification

```bash
pnpm --filter @patron/sdk-js install
pnpm --filter @patron/sdk-js build
test $? -eq 0

# Three outputs present
test -f packages/sdk-js/dist/index.mjs
test -f packages/sdk-js/dist/index.cjs
test -f packages/sdk-js/dist/index.global.js
test -f packages/sdk-js/dist/index.d.ts

# UMD exposes window.Patron (smoke via Node + jsdom)
node -e "global.window={}; require('./packages/sdk-js/dist/index.global.js'); if (!window.Patron) { process.exit(1) }"

# Package.json fields correct
node -e "const p=require('./packages/sdk-js/package.json'); if(!p.exports['.'].import || !p.unpkg) process.exit(1)"

# Vitest
pnpm --filter @patron/sdk-js test
test $? -eq 0

# 400-LOC
for f in $(find packages/sdk-js/src -type f -name "*.ts"); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done

pnpm --filter @patron/sdk-js lint
test $? -eq 0
```

## Notes

- **Context7 first**: query `tsup` for current build config (versions diverged between v6 and v8). Confirm IIFE / `globalName` syntax.
- **UMD/IIFE is non-negotiable** — many merchants (especially Shopify themes, Wordpress sites) can only consume a `<script src>` drop-in. The IIFE bundle must work without any module loader.
- Package name `@patron/sdk-js` is the npm-published name (per architecture monorepo plan). Mark `publishConfig.access: public` because it's a scoped package.
- `unpkg` + `jsdelivr` fields enable CDN distribution; document the CDN URL in README.
- Singleton `PatronClient` pattern: re-init logs a warning rather than throwing, so merchants who include the script twice don't crash.
- No runtime deps in v1 — keeps the bundle tiny (target < 10kb gzipped). DOM APIs only.
- `version` injected at build time via tsup's `define`/`replace` so users can introspect.
- Server-safe: the import must NOT touch `window` — guard all DOM access in functions, not at module top-level.
- File size < 400 LOC enforced.
- Foundation for stories 91-93 (button, modal, callbacks) and 98 (publish pipeline).
