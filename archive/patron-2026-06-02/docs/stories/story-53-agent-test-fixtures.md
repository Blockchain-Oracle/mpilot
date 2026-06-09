# Story 53 — Agent test fixtures: recorded tool-call sequences for Vitest (happy + 3 failure per intent)

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~2h
**Depends on:** story-46-intent-open-position, story-47-intent-repay-position, story-48-intent-monitor-depeg, story-49-intent-verify-merchant, story-50-intent-personalize-limits, story-51-intent-handle-dispute, story-52-erc8004-receipt-logging

## BDD Acceptance Criteria

```
Given the fixture directory `apps/api/src/agent/__fixtures__/` exists
When tests load fixtures via `loadFixture(intent, scenario)`
Then each fixture is a JSON file containing: { systemPrompt, userMessage, expectedToolCalls: [{name, input, mockedOutput}], expectedFinalResponse, expectedDecision }
And fixtures exist for all 6 intents × 4 scenarios each (24 fixtures total)
And each fixture loads in < 50ms (no live calls; pure JSON)

Given a Vitest test calls `runAgentWithFixture(fixture)`
When the test executes
Then `agentClient.messages.create` is mocked to replay the fixture's tool-call sequence in order
And each tool handler is mocked to return the fixture's `mockedOutput` (or throw the fixture's `mockedError`)
And the final agent response is asserted to match `expectedFinalResponse`
And the test does NOT make any live LLM call, RPC call, or HTTP call

Given a developer runs `pnpm fixtures:record --intent=OpenPosition --scenario=happy`
When the recorder runs (manual / off CI)
Then it makes ONE live LLM call against the real Anthropic API with real (test-net) RPC + MSW-mocked external APIs
And it serializes the full message thread + tool-call sequence to a fixture file
And the recorder requires `ANTHROPIC_API_KEY` + `MANTLE_SEPOLIA_RPC_URL` to be set
And recording is git-ignored by default in CI — only the resulting fixture JSON is committed

Given new code is added to an intent handler
When CI runs `pnpm vitest run src/agent/**/*.test.ts`
Then all 24 fixture-driven tests pass
And total test time < 30s (no live calls anywhere)
And any drift between fixture and actual handler behavior fails the test with a clear diff
```

## File modification map

- `apps/api/src/agent/__fixtures__/openPosition/happy.json` — NEW — full tool-call sequence for approve path
- `apps/api/src/agent/__fixtures__/openPosition/merchant-untrusted.json` — NEW
- `apps/api/src/agent/__fixtures__/openPosition/health-too-low.json` — NEW
- `apps/api/src/agent/__fixtures__/openPosition/simulation-revert.json` — NEW
- `apps/api/src/agent/__fixtures__/repayPosition/happy.json` — NEW
- `apps/api/src/agent/__fixtures__/repayPosition/defer-gas.json` — NEW
- `apps/api/src/agent/__fixtures__/repayPosition/noop-already-repaid.json` — NEW
- `apps/api/src/agent/__fixtures__/repayPosition/simulation-revert.json` — NEW
- `apps/api/src/agent/__fixtures__/monitorDepeg/noop-stable.json` — NEW
- `apps/api/src/agent/__fixtures__/monitorDepeg/escalate-rotate.json` — NEW
- `apps/api/src/agent/__fixtures__/monitorDepeg/skip-frozen.json` — NEW
- `apps/api/src/agent/__fixtures__/monitorDepeg/partial-rotation-failure.json` — NEW
- `apps/api/src/agent/__fixtures__/verifyMerchant/approve.json` — NEW
- `apps/api/src/agent/__fixtures__/verifyMerchant/flag-sanction.json` — NEW
- `apps/api/src/agent/__fixtures__/verifyMerchant/flag-insufficient-bond.json` — NEW
- `apps/api/src/agent/__fixtures__/verifyMerchant/flag-nansen-risk.json` — NEW
- `apps/api/src/agent/__fixtures__/personalizeLimits/full-history.json` — NEW
- `apps/api/src/agent/__fixtures__/personalizeLimits/insufficient-history.json` — NEW
- `apps/api/src/agent/__fixtures__/personalizeLimits/llm-unavailable.json` — NEW
- `apps/api/src/agent/__fixtures__/personalizeLimits/no-changes-needed.json` — NEW
- `apps/api/src/agent/__fixtures__/handleDispute/side-with-user.json` — NEW
- `apps/api/src/agent/__fixtures__/handleDispute/side-with-merchant.json` — NEW
- `apps/api/src/agent/__fixtures__/handleDispute/escalate-high-value.json` — NEW
- `apps/api/src/agent/__fixtures__/handleDispute/evidence-blocked.json` — NEW
- `apps/api/src/agent/__fixtures__/fixtureSchema.ts` — NEW — Zod schema for fixture shape; export `loadFixture(intent, scenario)` helper
- `apps/api/src/agent/__fixtures__/runAgentWithFixture.ts` — NEW — test helper: mocks `agentClient.messages.create` + tool handlers per fixture; replays the sequence; asserts final response
- `apps/api/src/agent/__fixtures__/__tests__/fixtureLoader.test.ts` — NEW — Vitest: every fixture file loads + passes the Zod schema
- `apps/api/scripts/recordFixture.ts` — NEW — recorder script (manual use): makes ONE live LLM call + serializes; gated by env var `RECORD_FIXTURES=1`
- `apps/api/package.json` — UPDATE — add scripts: `"test:agent": "vitest run src/agent"`, `"fixtures:record": "RECORD_FIXTURES=1 tsx scripts/recordFixture.ts"`

## Shell verification

```bash
cd apps/api

# All 24 fixtures exist
ls src/agent/__fixtures__/openPosition/ | wc -l | xargs test 4 -eq
ls src/agent/__fixtures__/repayPosition/ | wc -l | xargs test 4 -eq
ls src/agent/__fixtures__/monitorDepeg/ | wc -l | xargs test 4 -eq
ls src/agent/__fixtures__/verifyMerchant/ | wc -l | xargs test 4 -eq
ls src/agent/__fixtures__/personalizeLimits/ | wc -l | xargs test 4 -eq
ls src/agent/__fixtures__/handleDispute/ | wc -l | xargs test 4 -eq

# Fixture schema + loader exist
test -f src/agent/__fixtures__/fixtureSchema.ts
test -f src/agent/__fixtures__/runAgentWithFixture.ts

# All fixtures load + pass schema validation
pnpm vitest run src/agent/__fixtures__/__tests__/fixtureLoader.test.ts
test $? -eq 0

# Full agent suite passes (all intent tests use fixtures)
pnpm vitest run src/agent
test $? -eq 0

# No live API calls leak through — set fake creds and re-run
ANTHROPIC_API_KEY=fake MANTLE_RPC_URL=http://127.0.0.1:65535 pnpm vitest run src/agent
test $? -eq 0

# Recorder script exists + is gated
test -f scripts/recordFixture.ts
grep -q "RECORD_FIXTURES" scripts/recordFixture.ts

# Test suite runs fast
time pnpm vitest run src/agent 2>&1 | tail -1
```

## Notes

- Per design spec §10 testing strategy: "Vitest + mocked `@anthropic-ai/sdk` + recorded tool-call fixtures. All 6 intents; happy + 3 failure paths each." That's exactly 24 fixtures, exactly what this story produces.
- Per ADR-001: tests MUST NOT make live Anthropic API calls in CI. The fixtures capture the LLM's behavior once (during recording) and replay it deterministically thereafter. If the model upgrades and behavior shifts, re-record intentionally.
- Per security domain §3.1 (prompt injection): fixtures include adversarial inputs in at least the `evidence-blocked` and `flag-nansen-risk` scenarios so the agent's refusal behavior is regression-tested.
- The recorder (`recordFixture.ts`) is the ONE place that makes live calls, gated by `RECORD_FIXTURES=1`. CI never sets this. Local dev sets it intentionally when adding a new intent or scenario.
- Fixture schema captures: `{ intent, scenario, systemPrompt, userMessage, expectedToolCalls[], expectedFinalResponse, expectedDecision, recordedAt, modelVersion }`. The `modelVersion` field is the canary — if Anthropic releases a new model and we upgrade, mismatched recordings fail loudly.
- For intents that read `context` (story-41), fixtures include a seed `AgentContext` snapshot so the test doesn't need an ephemeral Postgres for fixture-only tests. Integration tests (separate from this story's pure fixture replay) still spin up Postgres.
- Total test time < 30s is the ceiling — if we exceed it, fixtures are likely doing too much; trim.
- Fixtures are JSON files (not TS) so they can be diffed visually in PRs and regenerated without touching code.
- File MUST stay under 400 LOC each (applies to TS helpers; JSON fixtures are exempt from the LOC rule per `biome.json` ignores from story-01).
