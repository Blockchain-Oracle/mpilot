# Story — Publish skill to RealClaw registry (`npm publish` + registry submission)

**ID:** story-154-skill-publish
**Epic:** Epic E9 — RealClaw Skill
**Depends on:** story-152-skill-install-flow, story-153-skill-readme-quickstart
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** the skill publishes to npm + the RealClaw registry via a single `pnpm run publish-skill` command, with automatic version bump + changelog + signed release commit
**So that** the Track-6 RealClaw submission has a clean publish trail and users get a discoverable artifact

---

## File modification map

- `packages/skill-mantle-agent/scripts/publish.ts` — NEW — orchestrates: lint → typecheck → tests → validate-manifest → bump version → CHANGELOG.md entry → git tag → npm publish → RealClaw registry POST
- `packages/skill-mantle-agent/CHANGELOG.md` — NEW — Keep-a-Changelog format
- `packages/skill-mantle-agent/.npmrc` — NEW — npm publish config (registry, scope, access=public)
- `.github/workflows/publish-skill.yml` — NEW — manual workflow_dispatch CI job that runs the publish script with provided version
- `packages/skill-mantle-agent/__tests__/publish-dry-run.test.ts` — NEW — runs the publish script with --dry-run flag and validates output

---

## Acceptance criteria (BDD)

```
Given `pnpm --filter @mpilot/skill-mantle-agent run publish --dry-run`
When executed
Then it: validates manifest, runs full test suite, computes the new version, generates a CHANGELOG entry, but does NOT publish (--dry-run honored)

Given any pre-publish check fails (lint, tests, validate-manifest)
When the publish script runs
Then it aborts BEFORE incrementing version OR creating git tag (transactional — no half-published state)

Given a clean dry-run
When `pnpm --filter @mpilot/skill-mantle-agent run publish --release` is run
Then version bumped in package.json + SKILL.md frontmatter (kept in sync), CHANGELOG entry added, git tag created (v0.1.0), npm publish executed, RealClaw registry POST sent

Given the RealClaw registry POST
When it fails (e.g., 503)
Then the script logs the failure AND prints recovery instructions (the npm publish already happened; the registry submission can be retried manually)

Given the npm publish
When it succeeds
Then the package is publicly installable via `npm install @mpilot/mantle-agent` AND `npx skills add @mpilot/mantle-agent` (the post-install script lives in the published artifact)

Given the version field is consistent
When the publish completes
Then package.json.version === SKILL.md frontmatter version (synchronized)

Given the publish workflow CI
When triggered via workflow_dispatch with version=0.1.1
Then it runs the publish script in --release mode AND requires manual approval (environment protection)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
test -f packages/skill-mantle-agent/scripts/publish.ts
test -f packages/skill-mantle-agent/CHANGELOG.md
test -f packages/skill-mantle-agent/.npmrc
test -f .github/workflows/publish-skill.yml

# Dry-run publish works
pnpm --filter @mpilot/skill-mantle-agent run publish --dry-run
test $? -eq 0

# Manifest version matches package.json version
bun -e "
  const pkg = require('./packages/skill-mantle-agent/package.json');
  const fm = require('fs').readFileSync('./packages/skill-mantle-agent/SKILL.md', 'utf-8').match(/version:\s*([^\s]+)/);
  if (!fm) { console.error('no version in SKILL.md'); process.exit(1); }
  if (fm[1] !== pkg.version) { console.error('version mismatch', fm[1], pkg.version); process.exit(1); }
"

# Tests pass
pnpm --filter @mpilot/skill-mantle-agent run test 2>&1 | grep "publish" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Transactional pre-publish checks.** Per CLAUDE.md no-silent-failures: if ANY check fails (lint, tests, manifest validation), the entire publish is aborted BEFORE the version bump. Half-published state is worse than failed publish.
- **`.npmrc` with `access=public`** because scoped npm packages default to private. We need public for users to install without auth.
- **RealClaw registry POST** is the Track-6 qualifier. The npm publish makes the skill installable; the RealClaw registry POST makes it DISCOVERABLE in the skill catalog. Both required.
- **Version sync between package.json and SKILL.md** is enforced by CI. Drift causes user confusion (which version is real?). The publish script bumps both in lockstep.
- **`workflow_dispatch` with environment protection** = manual approval before publish. Prevents accidental publishes from automated tooling.
- **CHANGELOG.md follows Keep-a-Changelog** (https://keepachangelog.com). Sections: Added/Changed/Deprecated/Removed/Fixed/Security. The publish script appends a new section for each release.
- **Git tag with signed annotation** if commit signing is set up. Tag format: `skill-v0.1.0`.
- **Registry POST endpoint** per `research/concierge/06-realclaw-skill-pkg.md` § publishing — verify the URL is current at publish time.
- **Dry-run support is non-negotiable** — testing the publish flow without actually publishing is a CI requirement.
- Cross-ref: `research/concierge/06-realclaw-skill-pkg.md` § publishing, npm + RealClaw registry docs.
