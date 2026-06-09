# Story 98 — Changesets + GitHub Action publish pipeline for SDKs

**Epic:** Epic 6 — Checkout SDKs
**Estimated:** ~1.5h
**Depends on:** story-97-sdk-docs-site, story-05-branch-protection-and-pr-template

## BDD Acceptance Criteria

```
Given the monorepo is installed
When `pnpm changeset` runs in interactive mode (locally, simulated in CI)
Then it offers `@patron/sdk-js`, `@patron/react`, and `@patron/shared` as publishable packages
And other packages (apps/*, demo-merchants/*, packages/contracts, packages/ui) are NOT offered (they are private)
And a changeset markdown file is created under .changeset/

Given a developer commits a changeset file with a PR
When the PR merges to main
Then a "Version Packages" PR is opened automatically by the changesets/action
And the PR bumps versions per the changeset (semver) and updates CHANGELOG.md per package

Given the "Version Packages" PR is approved and merged
When the publish workflow runs on the resulting commit
Then `pnpm changeset publish` runs
And `@patron/sdk-js` + `@patron/react` are published to npm under their respective scopes
And git tags `@patron/sdk-js@<ver>` and `@patron/react@<ver>` are pushed
And GitHub Releases are created with the changelog body

Given the workflow runs without a valid NPM_TOKEN
When publish would fire
Then the job fails fast with a clear error (so we know token rotation is needed)

Given the workflow runs but no packages have unpublished changesets
When `changeset publish` runs
Then it exits 0 with no-op (idempotent)

Given a release tag is pushed manually (e.g., emergency hotfix)
When the publish workflow detects the tag
Then it publishes the package at that exact ref (override path)
```

## File modification map

- `.changeset/config.json` — NEW — `{ "$schema": "https://unpkg.com/@changesets/config/schema.json", "changelog": ["@changesets/changelog-github", { "repo": "<owner>/patron" }], "commit": false, "fixed": [], "linked": [], "access": "public", "baseBranch": "main", "updateInternalDependencies": "patch", "ignore": ["@patron/web", "@patron/mini", "@patron/api", "@patron/docs", "@patron/contracts", "@patron/ui", "threads-by-mara", "pixelink", "dialer-pro"] }` — package names must match the actual `package.json` names defined in story-00 / each app.
- `.changeset/README.md` — NEW — short note explaining `pnpm changeset` flow for contributors.
- `package.json` (root) — UPDATE — add `@changesets/cli`, `@changesets/changelog-github` as devDependencies; add scripts: `changeset` (interactive), `changeset:version`, `changeset:publish`, `changeset:status`.
- `.github/workflows/release.yml` — NEW — workflow:
  - Triggers: `push` to `main` (for the Version Packages PR creation) + `workflow_dispatch`
  - Job 1 ("version-or-publish"): checkout, setup-node@v4 (Node 22), setup-pnpm, `pnpm install --frozen-lockfile`, `pnpm build --filter=@patron/sdk-js --filter=@patron/react`, then runs `changesets/action@v1` with `publish: pnpm changeset publish`, `version: pnpm changeset version`, `commit: "chore: version packages"`, `title: "chore: version packages"`. Env: `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`, `NPM_TOKEN: ${{ secrets.NPM_TOKEN }}`. Sets `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` and writes `.npmrc` for the publish step.
- `.github/workflows/ci.yml` — UPDATE — add a "changeset-check" job that runs `pnpm changeset status --since=origin/main` on PRs (non-blocking warning if no changeset and SDK code changed).
- `docs/SECRETS.md` — UPDATE — add `NPM_TOKEN` rotation notes; how to generate an Automation token at npmjs.com with publish scope on `@patron/*`.
- `.npmrc` (root) — NEW — `registry=https://registry.npmjs.org/` and `@patron:registry=https://registry.npmjs.org/`; do NOT commit auth tokens (the CI workflow writes a transient token).

## Shell verification

```bash
# Changesets installed
pnpm changeset --version
test $? -eq 0

# Config valid
node -e "const c=require('./.changeset/config.json'); if(!c.changelog) process.exit(1)"

# Publishable filter excludes private packages
node -e "
const c=require('./.changeset/config.json');
const ignored=c.ignore;
if(!ignored.includes('@patron/web')) process.exit(1);
if(!ignored.includes('@patron/api')) process.exit(1);
if(!ignored.includes('@patron/mini')) process.exit(1);
if(!ignored.includes('@patron/docs')) process.exit(1);
"

# Workflow file present + uses changesets action
test -f .github/workflows/release.yml
grep -q "changesets/action" .github/workflows/release.yml
grep -q "NPM_TOKEN" .github/workflows/release.yml

# Status command runs (no changesets is OK)
pnpm changeset status || true

# Dry-run publish (no actual publish)
pnpm --filter @patron/sdk-js build
pnpm --filter @patron/react build
pnpm changeset publish --dry-run || true
```

## Notes

- **Context7 first**: query `@changesets/cli` and `changesets/action` GitHub Action for current invocation shape — both have versioned breaking changes.
- Per architecture: `@patron/sdk-js` and `@patron/react` are the public publishable packages. `@patron/shared` MAY be published if it ships exported helpers (e.g., `telegram.ts` from story-79) — include it in the changesets allow-list. Everything else stays private (`"private": true` in their package.json).
- `NPM_TOKEN` must be an **Automation token** with publish access scoped to the `@patron` org. Manual tokens won't work in CI.
- The workflow uses the standard changesets/action pattern: on push to main, if changesets are pending → opens Version PR; if no pending changesets AND version PR was just merged → runs publish.
- For the hackathon, expect to publish `0.1.0` initial release before the Demo Day. Document the bootstrap step in SECRETS.md / a README "first release" subsection.
- `changeset-check` job in PR CI is non-blocking initially — flip to blocking once contributors are habituated.
- Provenance (`--provenance` flag) is recommended for npm publish (SLSA chain of custody); if hackathon timing allows, enable it.
- Tags are pushed in the same workflow run as publish to keep them in sync.
- File size < 400 LOC enforced (workflow YAML is fine; just kept short).
- Closes Epic 6 — once this ships, SDKs are publicly consumable from npm + CDN, satisfying the "merchants can integrate" PRD claim.
