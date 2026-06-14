# Story — `execute()` tick phase (UserOp submission via session key)

**ID:** story-66-tick-phase-execute
**Epic:** Epic E5 — Agent Runtime
**Depends on:** story-62-tick-loop-orchestrator, story-56-smart-account-tests
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge tick orchestrator
**I want to** a `runPhase('execute', proposal)` function signs a UserOperation with the user's session key, submits via the Pimlico bundler, and captures the receipt + actual gas used
**So that** the agent's intended action lands on Mantle with verifiable typing (UserOp via session key), audit-trail-ready receipt capture, and no untraceable EOA signing happening behind the scenes

---

## File modification map

- `packages/runtime/src/phases/execute.ts` — NEW — `runExecute(proposal, state)`. Loads the agent's session key (via `loadSessionKey` from story-53), constructs the UserOp from proposal.txParams via `kernelAccount.encodeCallData`, signs via the session-key kernel client, submits via `bundlerClient.sendUserOperation`, waits for `eth_waitForUserOperationReceipt` (timeout 30s), returns `{ userOpHash, txHash, blockNumber, gasUsedActual, status: 'confirmed' | 'failed' }`.
- `packages/runtime/src/phases/executeFallback.ts` — NEW — `runExecuteEOAFallback(proposal, state)` for users without smart accounts. Enqueues a row in `eoa_tx_queue` (from story-55), emits an SSE event prompting the user to sign. The actual signing + send happens out-of-tick (story-55 sender.ts). Returns `{ queueId, status: 'awaiting_user_signature' }`.
- `packages/runtime/src/phases/__tests__/execute.test.ts` — NEW — integration tests on a fork: execute a supply via session key → assert receipt + gasUsedActual; execute via EOA fallback → assert queue row inserted

---

## Acceptance criteria (BDD)

```
Given runExecute is called with a valid session key + approved proposal
When the function runs against a Sepolia fork
Then a UserOp is signed by the session key, submitted via the bundler, waits for receipt, returns { userOpHash, txHash, blockNumber, gasUsedActual, status: 'confirmed' }

Given the session key is expired
When loadSessionKey throws SessionKeyExpired
Then runExecute catches and returns { status: 'failed', error: 'session_key_expired' } (the orchestrator will trigger re-auth, NOT silently re-tick)

Given the UserOp times out (no receipt within 30s)
When eth_waitForUserOperationReceipt times out
Then runExecute returns { status: 'failed', error: 'timeout', userOpHash } (the userOpHash is preserved so a follow-up can poll for late confirmation)

Given the user has no smart account (EOA fallback)
When runExecute is called
Then it detects the absence of session keys AND enqueues an `eoa_tx_queue` row AND returns { status: 'awaiting_user_signature', queueId }

Given the UserOp reverts on the destination contract
When the receipt indicates failure
Then runExecute returns { status: 'failed', error: 'tx_reverted', revertReason } (parses the revert reason from the receipt logs)

Given the bundler returns a policy validation error (session key has no permission)
When runExecute submits
Then it throws SessionKeyPolicyRejected (typed; the orchestrator surfaces to the user — likely means the session key was issued before adding a new provider)

Given the gas spent is captured
When the UserOp confirms
Then gasUsedActual is recorded in the executions table (story-69) for cost analysis

Given the actual gas used matches the simulation estimate within 20%
When the validation runs
Then no warning is logged; outside 20% logs `gas_estimate_drift` warning for post-hoc analysis

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/runtime
test -f src/phases/execute.ts
test -f src/phases/executeFallback.ts

cd ../..

pnpm --filter @concierge-mantle/agent run build
test $? -eq 0

# Session key + bundler usage present
grep -q "loadSessionKey" packages/runtime/src/phases/execute.ts
grep -qE "(bundlerClient|sendUserOperation)" packages/runtime/src/phases/execute.ts

# Tests pass
pnpm --filter @concierge-mantle/agent run test 2>&1 | grep "execute" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **The 30s timeout** is for `eth_waitForUserOperationReceipt`. Mantle block time is ~6s; 30s gives 5 block confirmations of margin. If the UserOp never confirms (bundler dropped it, network issue), return failure with the userOpHash so a recovery script can poll later.
- **`status: 'awaiting_user_signature'`** is NOT a failure — it's a deliberate pause. The next tick will check if the user signed; if yes, mark proposal executed; if no after expiresAt, re-plan.
- **Session-key policy rejection** is distinct from tx revert. Policy reject = session key doesn't have permission (catch + surface to user — they need to re-issue with broader scope). Tx revert = the action itself failed (the simulate phase should have caught this; if it didn't, log as a simulation drift bug).
- **Gas estimate drift check** is a leading indicator of provider bugs (someone changed the provider's `simulate()` to under-estimate). Catches silent regressions in the provider layer.
- **Stale state mid-tick** mitigation per `research/concierge/04-agent-runtime.md` § 6: re-read `state` at the start of execute(). If something material changed since plan() (e.g., user did a manual tx), abort and re-tick. This catches the race where a user manually withdraws collateral between plan and execute.
- **No retries inside execute.** Per CLAUDE.md no-silent-failures: if the UserOp fails, return the failure. The orchestrator decides whether to re-plan next tick. Silent retry could double-execute.
- Cross-ref: `research/concierge/04-agent-runtime.md` § 3 execute row, `research/concierge/05-zerodev-erc4337.md` § session-key signing path.
