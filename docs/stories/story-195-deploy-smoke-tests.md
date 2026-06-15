# Story — Post-deploy smoke tests (full-surface health check across web + MCP + worker)

**ID:** story-195-deploy-smoke-tests
**Epic:** Epic E11 — Mainnet Deployment
**Depends on:** story-193-worker-fly-deploy, story-194-web-vercel-deploy, story-133-mcp-cloudflare-worker
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** mPilot maintainer right after any deploy
**I want to** a smoke test script hits every public surface (mpilot.xyz/, /docs, /app, /api/portfolio with test creds, mcp.mpilot.xyz/mcp initialize, worker /health) AND verifies expected responses
**So that** I know within 60 seconds whether a deploy broke ANYTHING user-visible — not waiting for users to report a broken landing page

---

## File modification map

- `scripts/smoke-test.sh` — NEW — orchestrator that runs all surface checks; exits 0 on green, 1 on any failure
- `scripts/smoke/landing.sh` — NEW — `curl -fs https://mpilot.xyz/` + assert H1 present
- `scripts/smoke/docs.sh` — NEW — `curl -fs https://mpilot.xyz/docs` + assert nav present
- `scripts/smoke/dashboard.sh` — NEW — `curl -fs https://mpilot.xyz/app` + assert redirect to landing (no auth → /; HTTP 307)
- `scripts/smoke/api.sh` — NEW — `curl -fs https://mpilot.xyz/api/portfolio` with test creds + assert JSON response
- `scripts/smoke/mcp.sh` — NEW — POST to https://mcp.mpilot.xyz/mcp with initialize JSON-RPC + assert capability descriptor
- `scripts/smoke/worker-health.sh` — NEW — `curl -fs https://<worker-fly-url>/health` + assert { redis: 'ok', postgres: 'ok' }
- `.github/workflows/post-deploy-smoke.yml` — NEW — runs smoke-test.sh after each production deploy; alerts on failure

---

## Acceptance criteria (BDD)

```
Given all surfaces are deployed and healthy
When `bash scripts/smoke-test.sh` runs
Then it: hits 6 surfaces (landing, docs, dashboard, api, mcp, worker), assert each is green, exits 0 in < 60s

Given the landing page surface is down (e.g., 502)
When the smoke test runs
Then `scripts/smoke/landing.sh` exits 1 AND the orchestrator exits 1 with a clear message naming the failed surface

Given the MCP server returns a malformed initialize response
When `scripts/smoke/mcp.sh` runs
Then it exits 1 with a diagnostic comparing the actual response to the expected schema

Given the worker /health returns 503 (Postgres down)
When `scripts/smoke/worker-health.sh` runs
Then it exits 1 with the specific failure reason ("postgres connection lost")

Given the post-deploy CI workflow
When triggered after a production deploy completes
Then the smoke test runs AND on failure: opens an issue + posts to Slack (configurable webhook)

Given the smoke test on the landing page
When the H1 check fails
Then the diagnostic includes "expected H1 containing 'autonomous DeFi agent', got <actual H1>" (specific, actionable)

Given the test creds for the API smoke test
When the secret is rotated
Then the runbook documents how to update the smoke-test creds (no silent breakage)

Given the smoke test runs in < 60s
When measured
Then total wall time across all 6 surface checks is < 60s (each surface check < 10s, run in parallel where possible)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
test -x scripts/smoke-test.sh
for surface in landing docs dashboard api mcp worker-health; do
  test -x scripts/smoke/$surface.sh || { echo "missing smoke: $surface"; exit 1; }
done
test -f .github/workflows/post-deploy-smoke.yml

# Smoke test script defaults to production
grep -q "mpilot.xyz" scripts/smoke-test.sh

# Each surface check is bounded by curl timeout
for surface in landing docs dashboard api mcp worker-health; do
  grep -qE "(--max-time|-m [0-9]+)" scripts/smoke/$surface.sh || { echo "no timeout in $surface"; exit 1; }
done

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **60s budget for the full smoke test.** Per `research/concierge/08-ux-component-intent.md` § observability: if the smoke test takes 5 minutes, no one runs it. Tight budget = always-run.
- **Parallel surface checks** via `&` and `wait` in bash. Each surface check is independent.
- **Each curl has --max-time 10**. A hanging curl shouldn't block the whole smoke test.
- **Specific diagnostics, not generic.** Per CLAUDE.md no-silent-failures: "smoke test failed" is useless; "smoke test failed: landing H1 missing — expected 'autonomous DeFi agent', got 'Page Not Found'" is actionable.
- **Test creds for API surface** = a dedicated `smoke-test@concierge.internal` Privy user with a Sepolia agent. Stored in CI secrets; rotated quarterly.
- **The post-deploy workflow triggers AFTER both web + worker deploys succeed** (using workflow_run dependency). Running before web deploy completes would always fail on the new code that didn't deploy yet.
- **Slack webhook** configurable via SLACK_WEBHOOK_URL env. Failed smoke tests post to #concierge-ops with the diagnostic.
- **GitHub Issue creation on failure** is the durable artifact. Slack notifications get lost; an issue persists until resolved.
- **The dashboard smoke test asserts 307 redirect to landing** (auth gate). If the dashboard returns 200 without auth, that's a regression — auth gate broken.
- Cross-ref: stories 100/130/193/194 (the surfaces this verifies), ADR-009 (worker process separation).
