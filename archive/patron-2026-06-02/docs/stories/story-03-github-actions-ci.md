# Story 03 — GitHub Actions CI (lint + typecheck + test + build)

**Epic:** Epic 0 — Foundation
**Estimated:** ~2h
**Depends on:** story-00-monorepo-scaffold, story-01-biome-and-loc-enforcement, story-02-typescript-config

## BDD Acceptance Criteria

```
Given a PR is opened against any branch
When GitHub Actions ci.yml is triggered
Then jobs run in this order: install → biome → typecheck → vitest → build
And all jobs run on Node 22 (matches .nvmrc)
And exit code is 0 on a freshly scaffolded repo

Given the CI workflow runs
When pnpm install completes
Then dependencies are cached by lockfile hash for subsequent runs
And total CI runtime on a fresh repo is < 4 minutes

Given a PR has a file exceeding 400 LOC
When CI runs
Then Biome check fails with a clear error message naming the file
And the PR cannot be merged until fixed

Given the build step runs
When `pnpm turbo run build` executes
Then turbo cache is leveraged on second+ runs (Vercel Remote Cache if configured)
And every package's build output is verified non-empty
```

## File modification map

- `.github/workflows/ci.yml` — NEW — job orchestration: install (with pnpm cache), biome, typecheck, vitest, build
- `.github/actions/setup-node-pnpm/action.yml` — NEW — composite action that sets up Node 22 + pnpm + caches store + restores `.turbo` cache
- `.github/workflows/_reusable-quality-gate.yml` — NEW — reusable workflow for the lint/typecheck/test pipeline (called from ci.yml and deploy-preview.yml)
- `README.md` — UPDATE — add CI badge
- `package.json` (root) — UPDATE — ensure scripts exist: `lint`, `typecheck`, `test`, `build`

## Shell verification

```bash
# Validate ci.yml is syntactically correct
gh workflow view ci.yml || echo "workflow not yet pushed; act validation:"
npx --yes @action-validator/cli .github/workflows/ci.yml

# Locally simulate the CI steps
pnpm install --frozen-lockfile
pnpm biome check .
pnpm turbo run typecheck
pnpm turbo run test
pnpm turbo run build

# Verify all jobs return 0
echo "All CI steps locally green"
```

## Notes

- Use `actions/checkout@v4`, `actions/setup-node@v4`, `pnpm/action-setup@v4`. Pin to specific minor versions to avoid surprise breakages.
- pnpm cache: `pnpm store path` + `actions/cache@v4` keyed by `pnpm-lock.yaml` hash.
- Turbo cache: cache `.turbo` directory keyed by lockfile + branch. For Vercel Remote Cache (cross-PR sharing), set `TURBO_TOKEN` + `TURBO_TEAM` as repo secrets (configure in story-06).
- Slither + Aderyn live in story-04 (`foundry-init-and-ci`); this story is the TS pipeline only.
- Use **matrix strategy** if testing multiple Node versions; for v1, single Node 22 job.
- Add `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }` so new pushes cancel in-flight CI on the same branch.
- Set `permissions: { contents: read }` at the workflow level (least privilege).
