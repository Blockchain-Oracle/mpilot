# Story 43 — Tool: on-chain write tools (session-key-signed txs)

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~2h
**Depends on:** story-42-tool-onchain-reads, story-20-agent-authorizer-tests

## BDD Acceptance Criteria

```
Given the agent registry is initialized
When `registerOnchainWriteTools()` is called at boot
Then 3 write tools are registered: openLoan, repayLoan, rotatePosition
And each tool's handler resolves the user's active session key from api_keys (or AgentAuthorizer view) before signing
And each handler enforces a per-action ceiling (default $50 USDC equivalent; configurable via spendingCaps.perActionUsd from context)

Given the agent calls `openLoan({ merchantId, amountUsdc, collateralAmount })`
When the handler runs
Then it first calls `PatronVault.previewOpenLoan` (static call) to simulate
And if simulation reverts it returns `{ error: 'simulation_revert', reason: <decoded revert reason> }` WITHOUT broadcasting
And if amountUsdc > spendingCaps.perActionUsd it returns `{ error: 'cap_exceeded', cap: <usd>, requested: <usd> }`
And if simulation succeeds it signs with the session-key wallet and submits via viem `walletClient.writeContract`
And the result includes `{ txHash, positionId, gasUsed, effectiveGasPrice }` after 1-block confirmation

Given the user is frozen (loaded via story-41 context)
When any write tool is invoked
Then the handler returns `{ error: 'agent_frozen' }` immediately without simulation
And no tx is signed or broadcast
And the failure is logged to agent_tasks.errorMessage with code 'agent_frozen'

Given a write tool successfully broadcasts a tx
When the handler returns
Then it emits an `agent.write.executed` event via the structured logger with {userId, tool, txHash, contract, gasUsed}
And it inserts a row into agent_tasks with status='succeeded' linking back to the parent task
And story-52's ERC-8004 receipt logger is invoked with the tx receipt to write the reputation entry
```

## File modification map

- `apps/api/src/agent/tools/onchain/sessionKey.ts` — NEW — `resolveSessionKey(userId)` returns a viem `WalletClient` whose account is the user's session key (loaded from KMS-equivalent: for v1 testnet, an encrypted column in api_keys; production: AWS KMS); throws `NoSessionKeyError` if none active
- `apps/api/src/agent/tools/onchain/openLoan.ts` — NEW — tool def + handler: load context → check frozen → check cap → previewOpenLoan (simulate) → writeContract → wait for receipt → return result
- `apps/api/src/agent/tools/onchain/repayLoan.ts` — NEW — tool def + handler: load position → simulate repay → check user has sufficient debt to repay (handles overpay) → writeContract → receipt
- `apps/api/src/agent/tools/onchain/rotatePosition.ts` — NEW — tool def + handler: triggered by MonitorDepeg; calls `PatronVault.rotate(positionId, newCollateralAsset)` (v1 only supports same-asset rotate i.e., partial close); simulate first
- `apps/api/src/agent/tools/onchain/writeSchemas.ts` — NEW — Zod input + output schemas for all 3 write tools; output includes optional `error` discriminator
- `apps/api/src/agent/tools/onchain/capEnforcer.ts` — NEW — pure helper `enforcePerActionCap(amountUsd, capUsd)` returns Result<void, CapExceeded>; reused across all writes; default cap = 50 USD when context.spendingCaps is null
- `apps/api/src/agent/tools/onchain/registerWrites.ts` — NEW — `registerOnchainWriteTools(registry)` wires all 3 tools
- `apps/api/src/agent/bootstrap.ts` — UPDATE — call `registerOnchainWriteTools` after read tools
- `apps/api/src/agent/tools/onchain/__tests__/onchainWrites.test.ts` — NEW — Vitest using Anvil fork OR mocked viem transport with recorded responses; covers per tool: (1) happy path with receipt, (2) simulation revert short-circuit, (3) cap_exceeded short-circuit, (4) agent_frozen short-circuit
- `apps/api/src/agent/__tests__/sessionKey.test.ts` — NEW — Vitest: load existing session key happy path, throws NoSessionKeyError on missing, refuses to load a revoked key

## Shell verification

```bash
cd apps/api

# Files exist
test -f src/agent/tools/onchain/openLoan.ts
test -f src/agent/tools/onchain/repayLoan.ts
test -f src/agent/tools/onchain/rotatePosition.ts
test -f src/agent/tools/onchain/sessionKey.ts
test -f src/agent/tools/onchain/capEnforcer.ts

# Per-action $50 default ceiling is enforced
grep -q "50" src/agent/tools/onchain/capEnforcer.ts
grep -q "cap_exceeded" src/agent/tools/onchain/writeSchemas.ts

# Simulation before broadcast is mandatory
grep -q "previewOpenLoan\|simulateContract" src/agent/tools/onchain/openLoan.ts

# Frozen check short-circuits writes
grep -q "agent_frozen\|frozen" src/agent/tools/onchain/openLoan.ts

# Tests pass (Anvil or mocked)
pnpm vitest run src/agent/tools/onchain/__tests__/onchainWrites.test.ts
test $? -eq 0
pnpm vitest run src/agent/__tests__/sessionKey.test.ts
test $? -eq 0

# Typecheck
pnpm typecheck
test $? -eq 0
```

## Notes

- Per ADR-004, the session key is an EIP-7702-delegated authority for the agent. v1 may fall back to scoped API keys; either way the session key is loaded server-side and used by viem to sign. NEVER expose the session-key private key to the LLM (no tool returns it).
- Per security domain §3.8 (excessive agency / scope creep), the per-action $50 USDC ceiling is the most important guardrail. Hardcoded as the default in `capEnforcer.ts`; users can raise it via the dashboard but the cap is always enforced server-side here BEFORE writeContract is called.
- Simulation-before-broadcast is mandatory. `previewOpenLoan` is a view function on PatronVault that runs the full open path; if it reverts, the agent learns the revert reason without paying gas and can decide an alternative action.
- Per security domain §3.4 (replay): every signed tx must have a unique nonce; viem handles this by default but tests must assert two consecutive openLoan calls produce two distinct txs (different nonces).
- Per security domain §3.6 (account compromise): if the session key is leaked, the cap + contract allowlist (from AgentAuthorizer) bounds the blast radius. The Emergency Freeze (story-71) revokes the key on-chain.
- Receipt logging to ERC-8004 is delegated to story-52's `logReputationEntry({ tool, params, txHash, success })` — invoked at the end of every write handler regardless of success/failure.
- Tests MUST use Anvil fork or mocked viem; NEVER live-broadcast in CI. Recorded fixtures live in story-53's harness.
- File MUST stay under 400 LOC each.
