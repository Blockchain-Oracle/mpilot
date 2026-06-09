# Story 01 — Biome + 400 LOC enforcement + pre-commit hook

**Epic:** Epic 0 — Foundation
**Estimated:** ~1h
**Depends on:** story-00-monorepo-scaffold

## BDD Acceptance Criteria

```
Given the monorepo is installed
When `pnpm biome check .` runs at the root
Then exit code is 0 on a freshly scaffolded repo (no errors, since no code yet)
And Biome lints all .ts, .tsx, .js, .jsx files in apps/, packages/, demo-merchants/

Given a developer commits a file with 401 non-empty non-comment lines
When the Husky pre-commit hook runs
Then the commit is BLOCKED by Biome's `lint/nursery/noExcessiveLinesPerFile` rule (configured with `maxLines: 400` in biome.json — per ADR-007)
And `scripts/check-file-loc.mjs` runs as a defense-in-depth secondary check (in case the nursery rule destabilizes between Biome releases)
And the error message names the file and the line count
And exit code is non-zero

Given a developer commits a file with exactly 400 lines
When the pre-commit hook runs
Then the commit succeeds (exit code 0)

Given a generated file (under packages/shared/abi/ or packages/contracts/out/ or *.d.ts) exceeds 400 lines
When `scripts/check-file-loc.mjs` runs against it
Then the file is IGNORED (matched against the script's ignore-glob list) and the commit succeeds

Given CI is running on a PR
When the `quality` job runs
Then `pnpm biome check .` exits 0 (Biome's noExcessiveLinesPerFile is the authority)
And `node scripts/check-file-loc.mjs --all` also exits 0 (defense-in-depth)
And both are required-to-pass gates per branch protection in story-05
```

## File modification map

- `biome.json` — NEW — root config: lint rules + format rules + `linter.rules.nursery.noExcessiveLinesPerFile: { "level": "error", "options": { "maxLines": 400 } }` + `linter.rules.complexity.noExcessiveLinesPerFunction: { "level": "warn", "options": { "maxLines": 50 } }` + ignore patterns for generated files (`**/abi/**`, `**/.next/**`, `**/dist/**`, `**/out/**`, `**/*.d.ts`, `**/coverage/**`, `**/.turbo/**`, `**/broadcast/**`). Pin Biome to a specific minor in `package.json` (nursery rules can drift between minors).
- `.husky/pre-commit` — NEW — runs `pnpm lint-staged`
- `.husky/install.mjs` — NEW — Husky v9 install script
- `package.json` (root) — UPDATE — add `prepare: "husky"` script; add `lint-staged` config that runs `biome check --apply` on changed files + the 400-LOC check
- `scripts/check-file-loc.mjs` — NEW — Node script that takes a list of file paths, counts non-empty non-comment lines, exits non-zero if any exceeds 400 (Biome's own rule should catch this; this script is a belt-and-braces secondary check)
- `package.json` (root devDependencies) — UPDATE — add `@biomejs/biome`, `husky`, `lint-staged`

## Shell verification

```bash
# Biome installs and runs clean on fresh repo
pnpm install
pnpm biome check . && echo "biome clean"

# Husky is installed
test -d .husky
test -x .husky/pre-commit

# 400-LOC enforcement smoke test
mkdir -p /tmp/loc-test
seq 1 401 > /tmp/loc-test/big.ts
node scripts/check-file-loc.mjs /tmp/loc-test/big.ts
test $? -ne 0  # should FAIL (exit nonzero)

seq 1 400 > /tmp/loc-test/ok.ts
node scripts/check-file-loc.mjs /tmp/loc-test/ok.ts
test $? -eq 0  # should PASS
```

## Notes

- **Per ADR-007 (RE-REVISED 2026-06-03):** Biome HAS native `noExcessiveLinesPerFile` rule (in `nursery` namespace) + `noExcessiveLinesPerFunction` (in `complexity`). Biome is PRIMARY enforcement; `scripts/check-file-loc.mjs` is defense-in-depth. (AUDIT-2 originally claimed Biome had no max-lines rule; spot-check found the nursery rule — see [[feedback-audits-can-be-wrong]] memory.)
- The 400-LOC check counts lines that are non-empty AND not pure comments (whitespace and `//` / `/* */` lines are excluded).
- Pre-commit hook MUST be fast (< 3s on a typical commit). `lint-staged` runs Biome only on staged files; `scripts/check-file-loc.mjs` runs only on staged files too.
- Script must accept either: (a) a list of file paths as argv (used by lint-staged), or (b) `--all` flag to scan the whole repo (used by CI).
- Document the rule prominently in CONTRIBUTING.md (next story) so contributors don't get surprised.
- If we later need React-specific lint rules Biome lacks, can add ESLint as a third tool for those rules only (per ADR-007 fallback).
