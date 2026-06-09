# Story — TypeScript config (strict, project references)

**ID:** story-02-typescript-config
**Epic:** Epic E0 — Foundation
**Depends on:** story-00-monorepo-scaffold
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Concierge contributor
**I want to** strict TS with project references across the monorepo
**So that** each package's types compose without circular imports or `any` leaks

---

## File modification map

- `tsconfig.base.json` — NEW — strict + modern target (`"target": "ES2023"`, `"moduleResolution": "Bundler"`, `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"verbatimModuleSyntax": true`, `"noEmit": true`, `"skipLibCheck": true`, `"jsx": "preserve"`)
- `tsconfig.json` — NEW — root project references file, references each package's tsconfig
- `packages/sdk/tsconfig.json` — NEW — extends base, adds `composite: true`, declares its output
- `packages/shared/tsconfig.json` — NEW — extends base
- `packages/ui/tsconfig.json` — NEW — extends base (designer fills implementation)
- `packages/skill/tsconfig.json` — NEW — extends base
- `apps/web/tsconfig.json` — NEW — extends base (Next.js will own its own additions in story-100)
- `apps/mcp/tsconfig.json` — NEW — extends base
- `apps/worker/tsconfig.json` — NEW — extends base
- `package.json` — UPDATE — add `typecheck` script (`tsc -b --noEmit`)

---

## Acceptance criteria (BDD)

```
Given tsconfig.base.json exists with strict mode
When `node -e "const c = require('./tsconfig.base.json'); console.log(c.compilerOptions.strict)"` runs
Then output is `true`

Given noUncheckedIndexedAccess is enabled
When the same node command checks that compiler option
Then output is `true`

Given root tsconfig.json has project references
When `node -e "const c = require('./tsconfig.json'); console.log(c.references.length)"` runs
Then output is ≥ 7 (sdk, shared, ui, skill, web, mcp, worker)

Given each package has its own tsconfig extending the base
When `pnpm run typecheck` runs at root
Then exit code is 0

Given a TS file uses `any` implicitly
When `pnpm run typecheck` runs
Then it fails with `error TS7006` or similar (strict mode catches it)
```

---

## Shell verification

```bash
test -f tsconfig.base.json
test -f tsconfig.json
test -f packages/sdk/tsconfig.json
test -f packages/shared/tsconfig.json
test -f packages/ui/tsconfig.json
test -f packages/skill/tsconfig.json
test -f apps/web/tsconfig.json
test -f apps/mcp/tsconfig.json
test -f apps/worker/tsconfig.json

# Strict mode + noUncheckedIndexedAccess + exactOptionalPropertyTypes
node -e "
  const c = require('./tsconfig.base.json');
  const o = c.compilerOptions;
  if (!o.strict || !o.noUncheckedIndexedAccess || !o.exactOptionalPropertyTypes) process.exit(1);
"

# Project references >= 7
node -e "
  const c = require('./tsconfig.json');
  if (!c.references || c.references.length < 7) process.exit(1);
"

# Typecheck passes (empty packages compile cleanly)
pnpm run typecheck
test $? -eq 0
```

---

## Notes for coding agent

- `noUncheckedIndexedAccess: true` is non-negotiable — catches the off-by-one bugs that bite agent runtimes (e.g., `messages[i]` returning `Message | undefined`).
- `verbatimModuleSyntax: true` forces explicit `import type` syntax — keeps the bundle clean.
- `moduleResolution: "Bundler"` — Next.js + Bun both prefer this over node16.
- Project references via `composite: true` enable incremental builds — critical for the orchestrator's parallel story dispatch.
- Each package's `tsconfig.json` should declare its `outDir`, `rootDir`, `composite`, and `references` to upstream packages.
- The `apps/web/tsconfig.json` here is a STARTING POINT — story-100 extends it with Next.js-specific bits.
