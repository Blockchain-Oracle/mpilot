# Story 42 — Tool: on-chain read tools (viem + multicall)

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~2h
**Depends on:** story-40-claude-agent-sdk-bootstrap, story-21-sepolia-deployment

## BDD Acceptance Criteria

```
Given the agent registry is initialized
When `registerOnchainReadTools()` is called at boot
Then 4 tools are registered: getPosition, getMerchantReputation, getHealthFactor, getOraclePrices
And each tool has a Zod input schema converted to Anthropic JSONSchema via zod-to-json-schema
And each tool's handler returns a JSON-serializable result with shape validated by an output Zod schema

Given the agent calls `getPosition({ positionId })`
When the tool handler runs
Then it uses viem `publicClient.readContract` to call PatronVault.positions(positionId)
And the result contains: owner (address), collateralAmount (string wei), debtAmount (string wei), healthFactor (string with 18 decimals), openedAt (number unix), status ('open'|'repaid'|'liquidated')
And BigInt values are JSON-stringified (BigInt is not JSON-safe)

Given the agent calls `getOraclePrices({ symbols: ['sUSDe','USDC'] })`
When the tool handler runs
Then it executes a viem multicall against `IAaveOracle.getAssetPrice(address)` on the Mantle Aave Oracle aggregator (per ADR-003 — there is no direct Chainlink sUSDe/USD feed on Mantle; Aave's "Capped sUSDe/USDT/USD" composite is the canonical source)
And the result is `{ sUSDe: { priceUsd: string, decimals: 8, source: 'aave_oracle' }, USDC: {...} }`
And if a per-asset read reverts (the composite has internal heartbeat checks that revert on stale source) the tool returns `{ error: 'oracle_unavailable', symbol: 'sUSDe' }` for that symbol
And the overall call does NOT throw — failed reads are surfaced as data so the agent can reason about them

Given a tool call fails (RPC timeout, contract revert)
When the handler catches the error
Then it returns `{ error: 'rpc_error', message: <safe message>, code: <viem error code> }`
And it does NOT leak the RPC URL or any env var into the error message
And the tool result is recorded in agent_tasks.result so the loop can continue or fail gracefully
```

## File modification map

- `apps/api/src/agent/tools/onchain/client.ts` — NEW — singleton viem `publicClient` for Mantle Sepolia + Mainnet (picks chain from `env.MANTLE_CHAIN_ID`); exports `getPublicClient(chainId)` factory
- `apps/api/src/agent/tools/onchain/getPosition.ts` — NEW — tool definition (`name`, `description`, `inputSchema`) + handler that calls `PatronVault.positions` and `PatronVault.getHealthFactor`; returns Zod-validated `PositionResult`
- `apps/api/src/agent/tools/onchain/getMerchantReputation.ts` — NEW — tool calling `ReputationProxy.getReputation(agentId)` for a given merchant slug → resolves slug → erc8004_agent_id via DB → on-chain read
- `apps/api/src/agent/tools/onchain/getHealthFactor.ts` — NEW — tool calling `PatronVault.getHealthFactor(positionId)`; convenience wrapper used heavily by MonitorDepeg
- `apps/api/src/agent/tools/onchain/getOraclePrices.ts` — NEW — multicall against `IAaveOracle.getAssetPrice(address)` on the Mantle Aave Oracle aggregator for known assets (map `symbol → assetAddress` lives in `packages/shared/addresses.ts`); revert-as-unavailable detection (no per-call staleness — see story-11 notes for why)
- `apps/api/src/agent/tools/onchain/schemas.ts` — NEW — Zod schemas for inputs + outputs of all 4 tools; export TS types
- `apps/api/src/agent/tools/onchain/register.ts` — NEW — `registerOnchainReadTools(registry)` registers all 4 tools with descriptions, schemas, handlers; called at boot from `apps/api/src/agent/bootstrap.ts`
- `apps/api/src/agent/bootstrap.ts` — UPDATE (file scaffolded in story-40 or created here if absent) — call `registerOnchainReadTools` + future write/external/byreal registrants
- `apps/api/src/agent/tools/onchain/__tests__/onchainReads.test.ts` — NEW — Vitest using viem `createTestClient` against Anvil fork OR mocked transport with recorded responses (NOT live calls); covers: happy path each tool, stale oracle path, RPC timeout path, contract revert path
- `packages/shared/src/oracleFeeds.ts` — NEW — map of `symbol → { aaveAsset: address, decimals: 8, source: 'aave_oracle' }` for assets priced via Mantle Aave Oracle, plus the Aave Oracle aggregator address per chainId (Sepolia + Mainnet)

## Shell verification

```bash
cd apps/api

# Files exist
test -f src/agent/tools/onchain/client.ts
test -f src/agent/tools/onchain/getPosition.ts
test -f src/agent/tools/onchain/getOraclePrices.ts
test -f src/agent/tools/onchain/register.ts

# Oracle-unavailable handling present (Aave Oracle: revert-as-error, not staleness threshold)
grep -q "oracle_unavailable\|AaveOracle" src/agent/tools/onchain/getOraclePrices.ts

# Multicall is used (not N sequential calls)
grep -q "multicall" src/agent/tools/onchain/getOraclePrices.ts

# Typecheck
pnpm typecheck
test $? -eq 0

# Tests pass (recorded fixtures, no live RPC)
pnpm vitest run src/agent/tools/onchain/__tests__/onchainReads.test.ts
test $? -eq 0

# BigInts are stringified (no JSON.stringify with BigInt error)
grep -q "toString()\|BigInt" src/agent/tools/onchain/getPosition.ts
```

## Notes

- Per ADR-001, all tools are TypeScript functions registered with the Anthropic SDK tool-use API (not OpenAI function calling, not MCP servers). The registry from story-40 is the glue.
- Per architecture stack: viem 2.x. Use `createPublicClient({ chain: mantleSepolia, transport: http(env.MANTLE_RPC_URL) })`.
- Oracle-failure detection is informed by security domain §1: USDe Oct 11 2025 cascade was partly an oracle-staleness problem. Per ADR-003 we use Aave Oracle (no direct Chainlink sUSDe/USD on Mantle); its Capped composite reverts internally on stale source feeds, so we treat "revert" as `oracle_unavailable`. Surface failed reads as data, NOT exceptions, so the agent can decide whether to refuse (preferred) or proceed with extra safety margin.
- Multicall uses viem's `client.multicall({ contracts: [...] })` against the canonical Multicall3 contract on Mantle. Cuts RPC requests from N to 1.
- Tool descriptions matter — they go into the system prompt cache. Be explicit and behavioral: `"Returns the user's open Patron position by ID. Use this BEFORE deciding to repay or rotate. Returns BigInt values as decimal strings."` This is how the LLM learns when to call which tool.
- Tests use recorded fixtures (per story-53), not live calls. Set `MANTLE_RPC_URL=http://127.0.0.1:65535` in test env to ensure live calls fail loudly if any leak through.
- File MUST stay under 400 LOC each.
