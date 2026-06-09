# Story 39 — Scheduler skeleton (BullMQ + Upstash Redis + observable cron)

**Epic:** Epic 2 — Backend Foundation
**Estimated:** ~1.5h
**Depends on:** story-33-db-schema-events-tasks-keys, story-06-env-and-secrets-setup

## BDD Acceptance Criteria

```
Given env var REDIS_URL is set to a valid Upstash rediss:// URL
When `pnpm --filter @patron/api scheduler:start` runs
Then a Pino log line appears: {"level":"info","msg":"scheduler started","queues":["agent_tasks","merchant_webhooks","heartbeat"]}
And the process stays alive
And the heartbeat job runs every 60s (observed by a log line: {"level":"info","msg":"heartbeat","tick":N})

Given the scheduler is running
When `curl -sf http://localhost:3001/health` runs
Then the response body includes `"scheduler":"ok"` (the api process queries Redis once and reports liveness)

Given a job is enqueued onto `agent_tasks` via the helper `enqueueAgentTask({intent:'noop', userId:'<uuid>'})`
When the worker picks it up
Then a log line appears for execution
And a row is updated in agent_tasks (status flows queued → running → succeeded)
And `pnpm --filter @patron/api test --run scheduler/scheduler.test.ts` exits 0

Given a worker throws an unhandled exception
When BullMQ retries the job per the retry policy (3 attempts, exponential backoff)
Then after final failure status='failed' and errorMessage is populated
And no infinite-retry loops occur
```

## File modification map

- `apps/api/src/scheduler/index.ts` — NEW — entrypoint; reads env, connects to Redis, registers all workers + scheduled jobs, starts; graceful shutdown on SIGTERM
- `apps/api/src/scheduler/redis.ts` — NEW — exports a singleton `ioredis` connection configured with TLS (`rediss://`) + connection retry; reused by both queues and workers
- `apps/api/src/scheduler/queues.ts` — NEW — defines named queues: `agentTasksQueue`, `merchantWebhooksQueue`, `heartbeatQueue`; each is a BullMQ `Queue` instance
- `apps/api/src/scheduler/workers/heartbeat.ts` — NEW — BullMQ worker that logs a tick line; demonstrates infra is healthy; the heartbeat job is enqueued via a repeatable cron (`every: 60_000`)
- `apps/api/src/scheduler/workers/agentTasks.ts` — NEW — BullMQ worker for the `agent_tasks` queue; v1 stub: receives `{taskId}`, marks DB row 'running' → 'succeeded' (no real agent call; Epic 3 fills in the real handler dispatch)
- `apps/api/src/scheduler/workers/merchantWebhooks.ts` — NEW — BullMQ worker for the `merchant_webhooks` queue; consumes events from story-37 (also stubbed; calls into the webhook service to apply state transitions)
- `apps/api/src/scheduler/enqueue.ts` — NEW — public helpers: `enqueueAgentTask({intent, userId, input})`, `enqueueMerchantWebhook({eventId})`; abstracts away BullMQ specifics so other services don't import bullmq directly
- `apps/api/src/scheduler/scheduledJobs.ts` — NEW — registers repeatable jobs at boot: heartbeat every 60s; placeholders for `monitorDepeg` (Epic 3 will set the real cadence; here it's a no-op every 5min just to prove the cron channel)
- `apps/api/src/routes/health.ts` — UPDATE — extend health body with `scheduler: 'ok' | 'down'` by checking redis client `status === 'ready'`
- `apps/api/src/lib/env.ts` — UPDATE — add `REDIS_URL: z.string().url()`, `SCHEDULER_HEARTBEAT_INTERVAL_MS: z.coerce.number().default(60_000)`
- `apps/api/package.json` — UPDATE — deps: `bullmq`, `ioredis`; scripts: `scheduler:start` (`tsx src/scheduler/index.ts`)
- `apps/api/src/__tests__/scheduler/scheduler.test.ts` — NEW — Vitest tests using `bullmq`'s in-memory mode or a real ephemeral Upstash db (CI provides REDIS_URL pointing at a test DB); enqueue → assert worker observes → assert agent_tasks row state transitions

## Shell verification

```bash
cd apps/api

# Tests pass
pnpm test --run scheduler/
test $? -eq 0

# Scheduler boots and stays up
pnpm scheduler:start &
SCH_PID=$!
sleep 4

# Process is alive
ps -p $SCH_PID > /dev/null
test $? -eq 0

# api reports scheduler ok
pnpm dev &
DEV_PID=$!
sleep 3
curl -sf http://localhost:3001/health | jq -e '.scheduler == "ok"'

# Wait for at least one heartbeat tick (>60s would be slow for CI; use ENV override)
SCHEDULER_HEARTBEAT_INTERVAL_MS=2000 pnpm scheduler:start &
SCH2_PID=$!
sleep 5
# Look for heartbeat log (BullMQ writes the job; we observe via DB or a log file)
# For shell verification, the test suite covers this — the smoke check is just liveness:
ps -p $SCH2_PID > /dev/null
kill $DEV_PID $SCH_PID $SCH2_PID
wait $DEV_PID $SCH_PID $SCH2_PID 2>/dev/null || true
```

## Notes

- Per architecture.md stack: **BullMQ on Upstash Redis (serverless)**. Use `bullmq` 5.x and `ioredis` for the connection.
- Upstash supports the `rediss://` (TLS) protocol — the `REDIS_URL` from story-06 already uses that scheme.
- Job retry policy (default for all workers): `attempts: 3, backoff: { type: 'exponential', delay: 5000 }`. Override per-job when needed.
- The `heartbeat` cron is the **observability primitive** for "scheduler is alive" — log + Sentry breadcrumb + the `/health` `scheduler` field all derive from heartbeat liveness.
- Repeatable jobs in BullMQ are defined via `queue.add(name, data, { repeat: { every: ms } })`; idempotency is handled by BullMQ's job ID schema.
- The agent task worker is a **stub** in this story — it just transitions DB state. Epic 3 (story-40+) wires in the actual Claude Agent SDK call. The handoff contract: scheduler picks up the row from `agent_tasks`, marks it `running`, calls into the agent dispatcher, gets back `{output, receiptUri, txHash}` (or an error), updates the row.
- The merchant webhook worker similarly handles dispatch — story-37 enqueues; this worker dequeues + delegates.
- Per architecture.md "Banned patterns": no `console.log` (Pino only); no silent error swallowing (every worker `catch` either logs + rethrows for BullMQ retry, or stamps `errorMessage` on the DB row).
- File MUST stay under 400 LOC each.
- The api + scheduler + indexer are three independent Node processes that share the same code (apps/api). On Railway: three services from the same image, each with a different `start` command.
- This story closes Epic 2. After it, all Epic 3 (agent) and Epic 6 (SDKs) work has the DB + queues + indexer + HTTP API it needs.
