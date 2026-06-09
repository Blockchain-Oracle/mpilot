# Story 00 — Monorepo scaffold

**Epic:** Epic 0 — Foundation
**Estimated:** ~1.5h
**Depends on:** None

## BDD Acceptance Criteria

```
Given a fresh clone of the repo
When `pnpm install` runs at the root
Then exit code is 0
And pnpm-workspace.yaml lists all packages: apps/web, apps/mini, apps/api, apps/docs, packages/contracts, packages/sdk-js, packages/sdk-react, packages/shared, packages/ui, demo-merchants/threads-by-mara, demo-merchants/pixelink, demo-merchants/dialer-pro

Given the monorepo is installed
When `pnpm turbo run build --dry-run` runs
Then it lists at least 11 packages (web, mini, api, docs, contracts, sdk-js, sdk-react, shared, ui, plus the 3 demo merchants)
And no circular dependencies are reported

Given a developer opens any package
When they run `pnpm dev` in that package
Then a dev server starts (Next.js for apps, watch mode for libs)
```

## File modification map

- `package.json` — NEW — root package.json with `"private": true`, pnpm@10, packageManager pinned
- `pnpm-workspace.yaml` — NEW — globs for `apps/*`, `packages/*`, `demo-merchants/*`
- `turbo.json` — NEW — pipeline config (`build`, `dev`, `test`, `lint`, `typecheck`)
- `tsconfig.base.json` — NEW — shared TS config (referenced by all per-package tsconfigs)
- `.gitignore` — NEW — node_modules, .next, dist, .turbo, .env, coverage, broadcast
- `.nvmrc` — NEW — `22`
- `apps/web/package.json` — NEW — Next.js 15 scaffold
- `apps/mini/package.json` — NEW — Next.js 15 scaffold
- `apps/api/package.json` — NEW — Hono scaffold
- `apps/docs/package.json` — NEW — Nextra scaffold
- `packages/contracts/package.json` — NEW — Foundry-wrapped TS package (publishes ABIs)
- `packages/sdk-js/package.json` — NEW — `@patron/sdk-js` skeleton
- `packages/sdk-react/package.json` — NEW — `@patron/react` skeleton
- `packages/shared/package.json` — NEW — `@patron/shared` skeleton
- `packages/ui/package.json` — NEW — `@patron/ui` skeleton
- `demo-merchants/threads-by-mara/package.json` — NEW
- `demo-merchants/pixelink/package.json` — NEW
- `demo-merchants/dialer-pro/package.json` — NEW
- `README.md` — NEW — placeholder with quickstart section

## Shell verification

```bash
pnpm install
test $? -eq 0
pnpm turbo run build --dry-run | grep -c "package:" | xargs test 11 -le
ls apps/web apps/mini apps/api apps/docs packages/contracts packages/sdk-js packages/sdk-react packages/shared packages/ui demo-merchants/threads-by-mara demo-merchants/pixelink demo-merchants/dialer-pro
```

## Notes

- Use **Node 22 LTS**. The repo MUST work on Node 22 (CI runs on 22).
- pnpm version pinned via `packageManager` field (npm reads it; engines.node also specified).
- Turborepo's remote cache should be configured for CI speed (Vercel Remote Cache); add in story-03.
- All `package.json` files must have `"private": true` except `sdk-js`, `sdk-react`, and `shared` which will be published. Mark publishable ones with `"publishConfig": { "access": "public" }`.
- No actual source code yet; this is pure scaffolding. Stories 01-06 layer on tooling.
