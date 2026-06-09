# Story 02 — TypeScript config + path aliases

**Epic:** Epic 0 — Foundation
**Estimated:** ~1h
**Depends on:** story-00-monorepo-scaffold

## BDD Acceptance Criteria

```
Given the monorepo is installed
When `pnpm typecheck` runs at the root (Turborepo orchestrates)
Then exit code is 0 (all packages typecheck cleanly with empty/scaffolded code)

Given any TS file in any package imports from `@patron/shared`
When tsc resolves the import
Then it resolves to `packages/shared/src/index.ts` via path alias
And NOT via published npm package (this is a monorepo workspace import)

Given a TS file uses the `any` type
When `pnpm biome check` runs
Then it emits a warning OR an error per biome.json config (we treat `noExplicitAny` as error)

Given `strict: true` is enabled in tsconfig.base.json
When any package's tsconfig extends it
Then all stricter checks apply (strictNullChecks, noImplicitAny, strictFunctionTypes, etc.)
```

## File modification map

- `tsconfig.base.json` — UPDATE — set `strict: true`, `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "Bundler"` (or "NodeNext" for backend), `lib: ["ES2022"]`, `esModuleInterop: true`, `skipLibCheck: true`, `forceConsistentCasingInFileNames: true`, `noUncheckedIndexedAccess: true`, `paths: { "@patron/shared": ["packages/shared/src/index.ts"], "@patron/ui": ["packages/ui/src/index.ts"] }`
- `apps/web/tsconfig.json` — NEW — extends base, sets jsx, includes Next.js types
- `apps/mini/tsconfig.json` — NEW — extends base, sets jsx
- `apps/api/tsconfig.json` — NEW — extends base, `moduleResolution: "NodeNext"`, `module: "NodeNext"`
- `apps/docs/tsconfig.json` — NEW — extends base
- `packages/contracts/tsconfig.json` — NEW — only for TS helpers + ABI exports
- `packages/sdk-js/tsconfig.json` — NEW — `declaration: true`, `declarationMap: true`, `outDir: dist`
- `packages/sdk-react/tsconfig.json` — NEW — same as sdk-js + jsx
- `packages/shared/tsconfig.json` — NEW — `declaration: true`, `composite: true` for project references
- `packages/ui/tsconfig.json` — NEW — extends base + jsx + declaration
- `demo-merchants/*/tsconfig.json` — NEW (×3) — Next.js extends base
- `turbo.json` — UPDATE — add `typecheck` task that depends on `^typecheck` (upstream packages must typecheck first)

## Shell verification

```bash
pnpm install
pnpm turbo run typecheck
test $? -eq 0

# Path alias works
node -e "import('./packages/shared/src/index.ts').then(m => console.log(typeof m))"

# strict mode is on
grep -q '"strict": true' tsconfig.base.json
grep -q '"noUncheckedIndexedAccess": true' tsconfig.base.json
```

## Notes

- `noUncheckedIndexedAccess: true` is the 2026 default — catches array-out-of-bounds and object-key-missing bugs at compile time. Worth the slight friction.
- `moduleResolution: "Bundler"` for frontends, `"NodeNext"` for backend (api), so Vite/Webpack/Next.js resolve correctly AND Node's ESM works on the backend.
- Path aliases configured at the workspace level (via pnpm workspaces) AND in tsconfig.base.json paths field. This dual config is intentional — pnpm handles runtime, tsconfig handles compile-time.
- DO NOT use `paths` for circular dependencies between packages; if you see one, redesign.
