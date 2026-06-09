# Story — BullMQ worker deploy on Fly.io (Dockerfile + machines + secrets)

**ID:** story-193-worker-fly-deploy
**Epic:** Epic E11 — Mainnet Deployment
**Depends on:** story-68-bullmq-cron-worker, story-191-pimlico-prod-config
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** the BullMQ worker process deploys to Fly.io with a production-grade Dockerfile, two machines in the EU region (low latency to Pimlico), structured logging shipped to a log aggregator, secrets configured per environment, autoscaling capped to 4 machines
**So that** the tick loop runs 24/7 with redundancy, observability, and cost controls — without a single-machine SPOF wiping out all agents on every deploy

---

## File modification map

- `apps/worker/fly.toml` — UPDATE (placeholder created in story-68) — full production config: 2 machines, EU region, shared-cpu-1x, secrets references, health checks
- `apps/worker/Dockerfile` — UPDATE (placeholder created in story-68) — multi-stage Bun build: builder stage installs deps + compiles; runner stage minimal alpine
- `apps/worker/.dockerignore` — NEW — excludes test files, source maps, dev deps
- `.github/workflows/deploy-worker.yml` — NEW — Fly.io deploy on push to main; runs flyctl deploy --strategy=rolling
- `apps/worker/src/health/healthcheck.ts` — NEW — `/health` endpoint that Fly.io polls (returns 200 if Redis + Postgres connections alive)
- `apps/worker/scripts/fly-secrets-checklist.sh` — NEW — verifies all required secrets are set; runs as pre-deploy gate
- `docs/DEPLOY-WORKER-RUNBOOK.md` — NEW — runbook for worker deploy + rollback

---

## Acceptance criteria (BDD)

```
Given fly.toml is configured
When `flyctl config validate` runs from apps/worker
Then exit code is 0

Given the Dockerfile builds
When `docker build -t concierge-worker apps/worker/` runs
Then exit code is 0 AND the resulting image is < 200MB (multi-stage trimming worked)

Given the production deploy
When `flyctl deploy --strategy=rolling` runs
Then 2 machines are deployed in sequence (rolling, never both down at once) AND each passes the /health check before the next deploys

Given the /health endpoint
When polled by Fly.io
Then it returns 200 + JSON { redis: 'ok', postgres: 'ok' } if both connections are alive AND 503 if either is down

Given the secrets checklist
When `bash apps/worker/scripts/fly-secrets-checklist.sh` runs
Then it verifies: REDIS_URL, DATABASE_URL, ANTHROPIC_API_KEY, PIMLICO_API_KEY, PINATA_JWT, WEB3_STORAGE_TOKEN are all set as Fly secrets

Given a missing secret
When the checklist runs
Then it exits 1 with a clear message naming the missing secret AND does NOT proceed to deploy

Given the deploy CI workflow
When push to main occurs
Then it builds the image, deploys to Fly.io, posts the deploy result to the PR/commit comment

Given autoscaling is configured
When the worker queue depth grows
Then machines scale up to MAX_INSTANCES=4 (NOT unbounded — cost cap) AND scale down to MIN_INSTANCES=2 (no zero — always-on coverage)

Given a rolling deploy fails mid-deploy
When the second machine's health check fails
Then Fly.io halts the rollout AND the first machine (still on old version) keeps running — no full outage

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
test -f apps/worker/fly.toml
test -f apps/worker/Dockerfile
test -f apps/worker/.dockerignore
test -f apps/worker/src/health/healthcheck.ts
test -f apps/worker/scripts/fly-secrets-checklist.sh
test -f docs/DEPLOY-WORKER-RUNBOOK.md
test -f .github/workflows/deploy-worker.yml

# Fly config validates
cd apps/worker && flyctl config validate && cd ../..

# Multi-stage build (FROM ... AS pattern present)
grep -qE "FROM .* AS (builder|build)" apps/worker/Dockerfile
grep -qE "FROM .* AS (runner|runtime)" apps/worker/Dockerfile

# Rolling strategy in CI
grep -q "rolling" .github/workflows/deploy-worker.yml

# Min/Max instances configured
grep -qE "min_machines_running.*[12]" apps/worker/fly.toml
grep -qE "max_machines_running.*[34]" apps/worker/fly.toml

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Two machines minimum** is the SPOF mitigation. ONE machine = if it dies mid-tick, ticks stop. Two machines = the surviving one keeps ticking while the dead one restarts. The Redis NX lock (story-62) handles the per-agent contention.
- **EU region for low-latency Pimlico**: Pimlico's bundler infrastructure is concentrated in EU; co-locating the worker process there saves 100ms+ per UserOp submission. Verify region with `flyctl regions list`.
- **Multi-stage Dockerfile** trims final image: builder has Bun + node_modules; runner has only the compiled output. Image size < 200MB = faster deploys + lower cold-start.
- **Rolling strategy never has both machines down at once.** Default Fly.io strategy IS rolling, but state it explicitly in the CI workflow as defense-in-depth.
- **Health check distinguishes Redis vs Postgres failure.** A Redis outage means ticks stop but proposals can still be created (degraded mode); a Postgres outage means everything stops. Different recovery paths.
- **Autoscaling capped at 4 machines** for cost control. At ~$5/machine/month, 4 = $20/month worst case. If we have enough users to need more, that's a good problem.
- **`flyctl secrets set` from CI** (NOT committed) for the secrets management. Local development uses .env.local (gitignored).
- **Log aggregator**: Fly.io's built-in log retention is 24hr. Ship logs to Axiom or Logtail for longer retention (free tier covers hackathon scale).
- Cross-ref: `research/concierge/04-agent-runtime.md` § 5 deploy patterns, ADR-009 (worker process model).
