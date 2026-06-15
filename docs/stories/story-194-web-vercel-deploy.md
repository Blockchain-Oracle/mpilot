# Story — Web app deploy on Vercel (envs + custom domain + preview-per-PR)

**ID:** story-194-web-vercel-deploy
**Epic:** Epic E11 — Mainnet Deployment
**Depends on:** story-100-next-app-scaffold, story-177-docs-deploy
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** mPilot maintainer
**I want to** the web app deploys to Vercel at mpilot.xyz (production) + preview URLs for every PR, with per-env secrets, edge functions for /api/* routes, and proper cache policy
**So that** marketing/dashboard/docs are live at the locked domain, PR previews let reviewers click through changes before merge, and the deploy itself is a non-event (Vercel does the lifting)

---

## File modification map

- `apps/web/vercel.json` — NEW — Vercel project config: env-scoped vars, edge function settings, redirects (e.g., /docs.html → /docs)
- `.github/workflows/deploy-web-preview.yml` — NEW — preview deploy on PR open; comments preview URL on the PR
- `.github/workflows/deploy-web-production.yml` — NEW — production deploy on merge to main; uses Vercel's GitHub integration
- `apps/web/scripts/vercel-secrets-checklist.sh` — NEW — verifies all required env vars are set in Vercel project settings
- `docs/DEPLOY-WEB-RUNBOOK.md` — NEW — runbook for web deploy + DNS + custom domain setup

---

## Acceptance criteria (BDD)

```
Given vercel.json is committed
When the Vercel project links the repo
Then env-scoped vars are auto-applied (preview vs production split correctly)

Given a PR is opened
When the deploy-web-preview workflow runs
Then a preview URL is generated AND posted as a PR comment with the format "Preview: https://concierge-pr-<num>.vercel.app"

Given a PR's preview deploy
When the preview URL is accessed
Then it serves the PR branch's code (NOT main's)

Given a merge to main
When the production deploy runs
Then mpilot.xyz reflects the merged code AND the deploy completes within 3 minutes

Given the custom domain
When https://mpilot.xyz is requested
Then it serves the production deploy with proper SSL (Vercel auto-provisions Let's Encrypt cert)

Given the /api/* routes
When inspected via vercel.json
Then they are configured to run on Edge runtime (NOT Node) for lower latency

Given the secrets checklist
When run
Then it verifies: ANTHROPIC_API_KEY, PRIVY_APP_SECRET, DATABASE_URL, REDIS_URL, PIMLICO_API_KEY, NEXT_PUBLIC_PRIVY_APP_ID are set in Vercel

Given a production deploy fails
When the build errors out
Then Vercel auto-aborts the rollout AND the previous production deploy keeps serving (zero downtime guarantee)

Given the cache policy
When inspected
Then static assets (JS, CSS, images) cache aggressively; HTML caches for 0s (always fresh); API routes cache per-endpoint as appropriate

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
test -f apps/web/vercel.json
test -f apps/web/scripts/vercel-secrets-checklist.sh
test -f docs/DEPLOY-WEB-RUNBOOK.md
test -f .github/workflows/deploy-web-preview.yml
test -f .github/workflows/deploy-web-production.yml

pnpm --filter @mpilot/web run build
test $? -eq 0

# Production workflow targets main
grep -qE "(branches:.*main|on:.*push:.*main)" .github/workflows/deploy-web-production.yml

# Preview workflow targets PR
grep -qE "(pull_request|on:.*pr)" .github/workflows/deploy-web-preview.yml

# Edge runtime configured
grep -qE "(runtime.*edge|edge)" apps/web/vercel.json

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Vercel GitHub integration** does the heavy lifting — install once, deploys automate. The workflow YAMLs are just for: comment-on-PR, custom secret rotation triggers, deploy gates.
- **Edge runtime for /api/*** matters for chat streaming (story-61) — Edge functions don't have the Vercel 10s timeout for streaming responses that Node functions have. Per CLAUDE.md: chat is interactive on the edge; long-running tick loop is on Fly.io worker.
- **Cache policy**: HTML = 0s (Next.js handles ISR per-page if needed); JS/CSS = 1 year (content-hashed); API responses depend on the endpoint (portfolio data ~60s; reputation feed ~5min).
- **Preview URL format** matters for the developer experience. Vercel's default is fine; configure custom domains only if needed (e.g., `pr-NNN.preview.mpilot.xyz`).
- **Production deploy on merge to main**, NOT on a release tag. Hackathon velocity: every merge is a release. Post-launch we add tag-gated production deploys.
- **DNS setup is documented** in DEPLOY-WEB-RUNBOOK.md — pointing mpilot.xyz to Vercel's nameservers, verifying with `dig`, certbot fallback if Vercel cert provisioning fails.
- **Zero-downtime is Vercel's default** for failed builds. Document this in the runbook so the team doesn't panic-rollback.
- **Privy + Anthropic keys** are the critical secrets. Without them the app loads but auth and chat are broken — surface failures with clear toasts (story-115) so users see useful errors.
- Cross-ref: ADR-011 (web on Vercel; worker on Fly.io; MCP on Workers — three different runtimes for three different needs), story-61 (chat API edge runtime).
