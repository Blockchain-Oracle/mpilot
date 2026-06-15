# Story — Pimlico production config + paymaster sponsorship policy

**ID:** story-191-pimlico-prod-config
**Epic:** Epic E11 — Mainnet Deployment
**Depends on:** story-51-pimlico-bundler-client, story-190-mainnet-deploy-runbook
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge maintainer deploying to Mainnet
**I want to** the Pimlico account is configured for production: API key with appropriate rate limits, sponsorship policy set for Sepolia (gasless onboarding) but NOT for Mainnet (users pay), monitoring + alerting wired
**So that** the bundler doesn't become a $5k/day cost shock, sponsorship only happens where intended, and the team gets paged before a real outage

---

## File modification map

- `docs/PIMLICO-PROD-CONFIG.md` — NEW — Pimlico console setup guide
- `apps/worker/src/config/pimlico.ts` — NEW — production-mode bundler config: per-chain endpoints, sponsorship policy, rate limit handling
- `apps/worker/src/__tests__/pimlico-config.test.ts` — NEW — unit tests for the sponsorship policy logic
- `scripts/pimlico-alert-test.sh` — NEW — smoke test that simulates a quota-near-exhaustion alert
- `apps/worker/src/monitor/pimlico-metrics.ts` — NEW — emits structured metrics: requests-per-minute, error rate, quota-remaining

---

## Acceptance criteria (BDD)

```
Given PIMLICO-PROD-CONFIG.md is read
When followed
Then a maintainer can: (1) create the Pimlico org, (2) get an API key, (3) set rate limits (60 RPM), (4) set sponsorship policy (Sepolia: yes; Mainnet: no), (5) wire alerts to Slack/email

Given the production config code
When inspected
Then it explicitly switches sponsorship based on chainId: 5003 (Sepolia) → paymaster=pimlico; 5000 (Mainnet) → paymaster=none

Given a Mainnet UserOp tries to claim sponsorship
When the config-layer guard runs
Then it throws PaymasterNotAllowed (typed error; NOT silently sponsored — that would burn our paymaster balance)

Given the rate limit handling
When Pimlico returns 429
Then the runtime catches the error, returns typed error `bundler_rate_limited`, the next tick retries (NOT silently swallows)

Given the metrics emit
When a UserOp succeeds
Then a structured Pino log entry includes { chain, bundler: 'pimlico', success: true, latencyMs }

Given a UserOp fails
When the metrics emit
Then the error type is captured: rate-limited, quota-exhausted, simulation-revert, validation-failure

Given the alert test script
When `bash scripts/pimlico-alert-test.sh` runs
Then it simulates 80% quota usage AND verifies the alert fires (via the configured channel)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
test -f docs/PIMLICO-PROD-CONFIG.md
test -f apps/worker/src/config/pimlico.ts
test -f scripts/pimlico-alert-test.sh
test -f apps/worker/src/monitor/pimlico-metrics.ts

pnpm --filter @mpilot/worker run build
test $? -eq 0

# Sepolia sponsorship + Mainnet no-sponsorship guard
grep -q "5003" apps/worker/src/config/pimlico.ts
grep -q "5000" apps/worker/src/config/pimlico.ts
grep -qE "(PaymasterNotAllowed|paymaster.*none)" apps/worker/src/config/pimlico.ts

# Tests pass
pnpm --filter @mpilot/worker run test 2>&1 | grep "pimlico-config" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Sponsorship policy is the cost-control kill switch.** Per `research/concierge/05-zerodev-erc4337.md` § costs: Sepolia sponsorship is free (Pimlico subsidizes); Mainnet sponsorship hits OUR paymaster balance. A bug that sponsors a Mainnet UserOp drains our balance fast. Hard-coded chainId guard is the answer.
- **Typed `PaymasterNotAllowed` error** is the explicit refusal. Per CLAUDE.md no-silent-failures: when a user tries to use sponsorship on Mainnet, the system must clearly refuse. Silent fallthrough to user-pays would surprise users.
- **Rate limit handling**: Pimlico returns 429 with Retry-After header. The runtime should: (1) catch the error, (2) log it as a structured warning, (3) return typed error so the next tick retries naturally — NOT block the worker process retrying inside a tight loop.
- **Metrics naming convention**: `pimlico.userop.{success,failure}` with tags. Lets the future observability stack (Grafana, Datadog) slice + dice without code changes.
- **Per-chain endpoints**: `https://api.pimlico.io/v2/mantle/rpc` (Mainnet); `https://api.pimlico.io/v2/mantle-sepolia/rpc` (Sepolia). VERIFY both support our use case via Context7 at deploy time — Pimlico Sepolia coverage drifts.
- **The alert test script** is a CI-friendly verification that alerts actually fire. Simulate by hitting a test-quota endpoint; verify the configured channel (Slack/email) receives.
- **Free-tier rate limit is 60 RPM** on Pimlico's free tier (per Context7 verification). Sufficient for hackathon traffic; upgrade only if usage explodes post-launch.
- **NEVER commit the Pimlico API key.** Use Fly.io secrets (`fly secrets set PIMLICO_API_KEY=...`); gitleaks in CI catches accidental commits.
- Cross-ref: `research/concierge/05-zerodev-erc4337.md` § Pimlico coverage, CLAUDE.md (Pimlico endpoint), ADR-010.
