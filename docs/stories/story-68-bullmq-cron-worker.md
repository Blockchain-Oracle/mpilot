# Story — BullMQ cron worker (per-agent 60s tick + concurrency)

**ID:** story-68-bullmq-cron-worker
**Epic:** Epic E5 — Agent Runtime
**Depends on:** story-62-tick-loop-orchestrator
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** a BullMQ worker process schedules per-agent repeatable jobs every 60s (default cadence) with concurrency=5, retry policy, and dead-letter-queue routing
**So that** the worker can handle hundreds of users without one slow agent's tick blocking others, and failed ticks are observable for post-hoc analysis

---

## File modification map

- `apps/worker/package.json` — NEW — Node process workspace package, deps on `@concierge-mantle/agent`, `bullmq`, `ioredis`, `pino`, `@sentry/node`
- `apps/worker/src/index.ts` — NEW — entry point. Loads env (story-24 config), connects to Redis, spawns the Worker with concurrency=5, registers signal handlers (SIGTERM → drain → exit).
- `apps/worker/src/scheduler.ts` — NEW — `scheduleAgentTicks(agentId, cadenceMs)` adds a BullMQ repeatable job. Reschedules if cadence changes (uses `repeat.key: 'tick-${agentId}'` so re-adding the same agent updates the schedule instead of duplicating per `research/concierge/04-agent-runtime.md` § 5).
- `apps/worker/src/tickJob.ts` — NEW — the BullMQ Worker's job processor. Calls `tick(agentId)` from `@concierge-mantle/agent`, captures result, updates ticks table, handles errors via DLQ routing.
- `apps/worker/src/dlq.ts` — NEW — dead-letter queue routing: ticks that fail 3 times go to a 'failed-ticks' queue for manual review.
- `apps/worker/fly.toml` — NEW — Fly.io deploy config (per `research/concierge/04-agent-runtime.md` § 5 recommendation)
- `apps/worker/Dockerfile` — NEW — multi-stage Bun build

---

## Acceptance criteria (BDD)

```
Given the worker starts
When `pnpm --filter @concierge-mantle/worker dev` runs locally with Redis connected
Then it logs "worker ready" and begins polling the BullMQ queue

Given `scheduleAgentTicks(agentId, 60_000)` is called
When BullMQ processes the schedule
Then a repeatable job is added with `repeat.every === 60_000` AND `repeat.key === 'tick-${agentId}'`

Given the same agent is scheduled twice
When scheduleAgentTicks is called a second time
Then BullMQ deduplicates via the repeat.key (no double-scheduling; verify by inspecting the queue state)

Given concurrency=5 is set
When 10 agents tick simultaneously
Then up to 5 ticks run in parallel; the rest queue and execute as workers free up

Given a tick throws an error
When the BullMQ job processor catches it
Then the job is retried per BullMQ's defaultRetryAttempts (3) with exponential backoff; on final failure, routed to the 'failed-ticks' DLQ

Given SIGTERM is received
When the worker shuts down
Then it stops accepting new jobs, allows in-flight ticks to complete (max 60s drain timeout), then exits cleanly

Given a tick returns `{ skipped: 'already_running' }` (lock contention from story-62)
When the worker logs the result
Then it logs at debug level (NOT error) AND the BullMQ job is marked completed (NOT retried)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/worker
test -f package.json
test -f src/index.ts
test -f src/scheduler.ts
test -f src/tickJob.ts
test -f src/dlq.ts
test -f fly.toml
test -f Dockerfile

cd ../..

pnpm --filter @concierge-mantle/worker run build
test $? -eq 0
pnpm run typecheck

# Concurrency = 5
grep -q "concurrency: 5" apps/worker/src/index.ts

# Repeatable job uses .key for dedup
grep -q "repeat.key" apps/worker/src/scheduler.ts

# SIGTERM handling
grep -q "SIGTERM" apps/worker/src/index.ts

# DLQ wired
grep -q "failed-ticks" apps/worker/src/dlq.ts

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Per-agent repeatable job via `repeat.key`** is the canonical BullMQ pattern. Without the key, calling `q.add` multiple times for the same agent creates DUPLICATE schedules (the worker would tick the agent twice per cadence). Reference: `research/concierge/04-agent-runtime.md` § 5.
- **Concurrency=5** lets up to 5 agents tick in parallel per worker process. Combined with Redis NX lock (story-62), this means: parallel workers + per-agent serial execution.
- **DLQ routing on final retry failure** — ticks that fail 3 times go to manual-review queue. Surfaces persistent bugs without burning RPC quota on infinite retries.
- **Tick skip = success.** Per CLAUDE.md no-silent-failures: a skipped tick (lock contention) is a SUCCESS — the agent is already being ticked by another worker. Mark the job completed; don't retry; log at debug level.
- **60s drain on SIGTERM.** Fly.io rolling deploys signal SIGTERM with a 60s grace window. Honor it; finish in-flight ticks before exit. Without this, a deploy mid-tick causes incomplete attestations.
- **Per ADR-009 + research/concierge/04-agent-runtime.md § 5:** the worker process runs separately from the Next.js web app. Cleaner separation of concerns; the Vercel function 10s SSE limit doesn't apply.
- **Fly.io deploy** is the verified Mantle-compatible host (low latency to Pimlico bundler in EU regions). Cloud Run + Cron is the v1.1 alternative if Fly cost grows.
- Cross-ref: `research/concierge/04-agent-runtime.md` § 5 BullMQ patterns, ADR-009 Postgres + Redis.
