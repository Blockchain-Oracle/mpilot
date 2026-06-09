# Story 50 — Intent handler: PersonalizeLimits (weekly batch; Sonnet 4.6)

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~1.5h
**Depends on:** story-41-agent-context-loader, story-39-scheduler-skeleton

## BDD Acceptance Criteria

```
Given a cron job named `personalize-limits-weekly` runs every Sunday at 08:00 UTC
When the job executes
Then it queries all users where last_personalized_at IS NULL OR last_personalized_at < now() - 7 days
And for each user it enqueues a PersonalizeLimits agent task with input={userId}
And the job is idempotent — a re-run within the same week does NOT re-enqueue already-personalized users

Given a queued agent_task with intent='PersonalizeLimits'
When `runPersonalizeLimitsIntent(task)` is called
Then it invokes `runAgent` with model=AGENT_MODEL_BATCH (claude-sonnet-4-6, NOT Opus 4.7)
And tools: [getPosition, getMerchantReputation] only (read-only; no writes ever from this intent)
And tool_choice="auto" (the agent MAY decide nothing needs changing)
And max_iterations=4 (small budget — this is a recommendation task, not a decision task)

Given the agent produces recommendations
When it returns the final answer
Then the schema is `{ recommendations: { perActionUsd: number, dailyUsd: number, merchantWhitelist: string[], repaymentCadenceDays: number, rationale: string }, autoApplied: false }`
And the recommendations row is inserted into `personalization_suggestions` table for the user
And the user receives a notification with link to dashboard `/app/agent/settings` to accept or override
And NO settings are auto-applied — the user must explicitly accept (per design spec §7: "User accepts / overrides")

Given the user has fewer than 3 historical positions
When the agent runs
Then the recommendation includes conservative defaults: perActionUsd=50, dailyUsd=100, empty whitelist (user picks), repaymentCadenceDays=7
And rationale explicitly states "insufficient history — conservative defaults applied"

Given the LLM call fails (rate limit, network)
When the runner exhausts retries
Then the agent_task is marked status='failed' with errorMessage='llm_unavailable'
And the cron retries the user on its next weekly tick
And the user's existing limits remain unchanged
```

## File modification map

- `apps/api/src/agent/intents/personalizeLimits.ts` — NEW — `runPersonalizeLimitsIntent(task)`; uses model=AGENT_MODEL_BATCH
- `apps/api/src/agent/prompts/personalizeLimits.ts` — NEW — per-intent prompt: analyze position history + spending patterns + merchant repeat-usage → suggest limits + whitelist
- `apps/api/src/agent/intents/personalizeResultSchema.ts` — NEW — Zod schema for recommendations
- `apps/api/src/db/schema/personalizationSuggestions.ts` — NEW — Drizzle table: id, user_id, recommendations jsonb, accepted_at, rejected_at, created_at
- `apps/api/src/db/schema/users.ts` — UPDATE — add `last_personalized_at` timestamptz column + migration
- `apps/api/src/jobs/personalizeLimitsCron.ts` — NEW — BullMQ repeatable job (`cron: '0 8 * * 0'` Sunday 08:00 UTC); enqueues per eligible user
- `apps/api/src/jobs/runPersonalizeLimitsJob.ts` — NEW — BullMQ worker
- `apps/api/src/queues/personalizeLimitsQueue.ts` — NEW — queue + enqueue helper
- `apps/api/src/agent/intents/__tests__/personalizeLimits.test.ts` — NEW — Vitest using recorded fixtures: (1) happy path with full history → tuned recommendations, (2) insufficient history → conservative defaults, (3) llm_unavailable failure, (4) cron idempotency

## Shell verification

```bash
cd apps/api

# Files exist
test -f src/agent/intents/personalizeLimits.ts
test -f src/agent/prompts/personalizeLimits.ts
test -f src/jobs/personalizeLimitsCron.ts
test -f src/db/schema/personalizationSuggestions.ts

# Uses Sonnet 4.6 batch model (per architecture stack)
grep -q "AGENT_MODEL_BATCH\|claude-sonnet-4-6" src/agent/intents/personalizeLimits.ts

# Cron is weekly Sunday 08:00 UTC
grep -q "0 8 \\* \\* 0" src/jobs/personalizeLimitsCron.ts

# Read-only tools only (no openLoan / repayLoan / rotatePosition)
! grep -E "openLoan|repayLoan|rotatePosition" src/agent/intents/personalizeLimits.ts

# autoApplied=false enforced
grep -q "autoApplied.*false\|accepted_at" src/agent/intents/personalizeLimits.ts

# Tests pass
pnpm vitest run src/agent/intents/__tests__/personalizeLimits.test.ts
test $? -eq 0

# Typecheck
pnpm typecheck
test $? -eq 0
```

## Notes

- Per design spec §6, PersonalizeLimits is the agent's fifth "real decision": based on user history, suggests spending caps + merchant whitelist + repayment cadence. **User accepts / overrides** — this is a recommendation task, not an autonomous action.
- Per architecture stack table: this intent is the ONE that uses Sonnet 4.6 (batch). Opus 4.7 is overkill for periodic recommendation generation — Sonnet is faster + cheaper and the quality is sufficient for "suggest reasonable defaults".
- Per security domain §3.8 (excessive agency / scope creep): this intent has tool_choice="auto" and READ-ONLY tools. The user's existing limits stay in effect until they explicitly accept the recommendation via the dashboard.
- Per architecture stack: `cron: '0 8 * * 0'` (BullMQ repeatable) = every Sunday at 08:00 UTC. Time zone is intentionally UTC — users see notifications when they next visit the dashboard.
- The `personalization_suggestions` table is a history of every recommendation generated; the dashboard renders the latest unaccepted one. Users can view + diff against current settings.
- Conservative defaults for low-history users align with the $50 per-action ceiling (story-43) — the same number, intentionally — so a brand-new user's agent never silently exceeds it.
- `autoApplied: false` is hardcoded in the schema as a discriminating literal so any future refactor that tries to apply automatically will fail Zod validation at the boundary.
- File MUST stay under 400 LOC each.
