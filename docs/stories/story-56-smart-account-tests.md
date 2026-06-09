# Story — Smart account layer integration tests (end-to-end ERC-4337 flow)

**ID:** story-56-smart-account-tests
**Epic:** Epic E4 — Smart Account Layer
**Depends on:** story-51-pimlico-bundler-client, story-53-session-key-issuance-flow
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** end-to-end integration tests verify the full ERC-4337 flow: owner-EOA creates a Kernel account, owner signs a session-key policy, the agent worker uses the session key to submit a UserOp via Pimlico, the bundler routes through the EntryPoint, and the action executes on the destination contract — all on a Mantle Sepolia Anvil fork
**So that** the smart account layer's components are provably wired correctly before the agent runtime depends on them

---

## File modification map

- `packages/smart-account/src/__tests__/e2e/createAndUseAccount.test.ts` — NEW — full flow: createConciergeAccount → fund with MNT → issueSessionKey → submit UserOp via session key targeting a mock contract → assert state changed
- `packages/smart-account/src/__tests__/e2e/policyEnforcement.test.ts` — NEW — issue session key with policy { targets: [aavePool], selectors: [supply.selector] } → attempt UserOp to a DIFFERENT contract → assert reverts with UnauthorizedTarget; attempt UserOp with a DIFFERENT selector → asserts reverts; attempt UserOp under spending limit → succeeds; attempt UserOp over spending limit → reverts
- `packages/smart-account/src/__tests__/e2e/revocation.test.ts` — NEW — issue key → succeeds at first UserOp → revoke → assert second UserOp fails with UnauthorizedValidator
- `packages/smart-account/src/__tests__/e2e/eoaFallback.test.ts` — NEW — user has NO smart account → agent proposes via queue → user "signs" the raw tx (test wallet directly) → sendSignedTx submits → confirms
- `packages/smart-account/src/__tests__/e2e/setup.ts` — NEW — spawns Anvil fork from Mantle Sepolia, spawns a MOCK Pimlico bundler (using `viem`'s `createBundlerClient` against the same Anvil instance — Anvil includes bundler RPC methods natively per the alto/rundler integration), seeds wallets, deploys a target contract for the tests
- `packages/smart-account/vitest.config.ts` — UPDATE — `pool: 'forks'`, 60s timeout (e2e tests are slow due to Anvil + bundler RPC roundtrips)

---

## Acceptance criteria (BDD)

```
Given Vitest is configured
When `pnpm --filter @concierge/smart-account run test:e2e` runs
Then exit code is 0 AND ≥ 12 e2e test cases pass

Given test_e2e_createAndUseAccount
When the full flow runs (create account → fund → issue key → submit UserOp)
Then the destination mock contract's state changed AND the UserOp's transaction hash is recorded AND the smart account paid the gas

Given test_e2e_PolicyTargetEnforcement
When the agent submits a UserOp targeting an address NOT in the policy's targets list
Then the bundler returns a policy validation error (the UserOp does not execute, no destination state changes)

Given test_e2e_PolicySelectorEnforcement
When the agent submits a UserOp with a selector NOT in the policy's selectors list
Then the bundler returns a policy validation error (UserOp does not execute)

Given test_e2e_SpendingLimitEnforcement
When the agent submits 2 USDC transfers within the daily window, the second one would push over the daily limit
Then the second UserOp is rejected by the bundler with a SpendingLimitExceeded error

Given test_e2e_TimeFrameEnforcement
When the test fast-forwards Anvil time past validUntil
Then the session key UserOp is rejected (the validator's TimeFramePolicy rejects)

Given test_e2e_Revocation
When the owner revokes the session key
Then a subsequent UserOp signed by the old session key fails with UnauthorizedValidator

Given test_e2e_EOAFallback
When the agent enqueues a tx for a user with no smart account → the user signs → sendSignedTx submits
Then the tx confirms on the fork AND the queue row is markedConfirmed AND the queue's status transitions match the expected state machine

Given test_e2e_PaymasterSponsorship
When the agent runs on the Sepolia config with paymaster=pimlico
Then the smart account holds ZERO MNT before the UserOp AND the UserOp succeeds (the paymaster paid gas)

Given test_e2e_NoPaymasterRequiresMNT
When the agent runs on the Mainnet config with paymaster=none AND the smart account has 0 MNT
Then the UserOp fails with InsufficientFunds (NOT silently — typed error)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every e2e test file ≤ 400 LOC

Given coverage gate
When `pnpm --filter @concierge/smart-account run test --coverage` runs
Then line coverage on `src/` ≥ 80%
```

---

## Shell verification

```bash
pnpm --filter @concierge/smart-account run test:e2e --reporter=verbose
test $? -eq 0

pnpm --filter @concierge/smart-account run test:e2e --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 12 {exit 0} {exit 1}'

# Critical load-bearing tests
for tn in PolicyTargetEnforcement PolicySelectorEnforcement SpendingLimitEnforcement Revocation PaymasterSponsorship; do
  pnpm --filter @concierge/smart-account run test:e2e --reporter=verbose 2>&1 | grep "$tn" | grep -q "✓" || { echo "missing $tn"; exit 1; }
done

# Coverage ≥ 80%
cov=$(pnpm --filter @concierge/smart-account run test --coverage 2>&1 | grep "All files" | awk '{print $4}' | tr -d '%')
test "${cov%.*}" -ge 80

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Local bundler via Anvil:** Anvil 0.3.0+ exposes ERC-4337 bundler RPC methods natively (`eth_sendUserOperation`, `eth_estimateUserOperationGas`, etc.) when run with `--auto-impersonate`. No need to spin up a real Pimlico/Alto/Rundler — the bundler client wired in story-51 can target the Anvil endpoint. Reference: `https://book.getfoundry.sh/anvil/`.
- **Policy enforcement is the load-bearing assertion.** A future regression that loosens the policy validator silently would let a leaked session key drain a wallet. Each enforcement test (target, selector, spendingLimit, timeFrame) is one regression guard. Don't merge any policy change without these tests passing.
- **`PaymasterSponsorship` test verifies the Sepolia gasless onboarding flow.** Without it, a regression in the paymaster wiring could break the "judge tries Concierge on Sepolia" flow without anyone noticing until demo day.
- **`NoPaymasterRequiresMNT` is the inverse — Mainnet's user-pays guard.** A regression here would silently fail Mainnet UserOps with cryptic out-of-gas errors instead of the clean InsufficientFunds typed error.
- **`Revocation` test uses the FULL revocation flow from story-54** (DB + on-chain + cron pause). Not a unit-level test — integration that proves all three layers compose correctly.
- **EOA fallback test runs no bundler at all** — pure EOA signing + sendRawTransaction. Validates the fallback path works without ERC-4337.
- **Anvil time travel** via `anvil_setNextBlockTimestamp` for the TimeFramePolicy test. Deterministic.
- **60s timeout** because spinning up Anvil + deploying mock contracts + issuing session keys + submitting UserOps adds up.
- Cross-ref: ADR-010 (every component this test validates), `research/concierge/05-zerodev-erc4337.md` § Verified facts (Pimlico Mantle support).
