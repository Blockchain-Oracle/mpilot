# Story — Mainnet deployment runbook (`docs/DEPLOY-MAINNET-RUNBOOK.md`)

**ID:** story-190-mainnet-deploy-runbook
**Epic:** Epic E11 — Mainnet Deployment
**Depends on:** story-19-mainnet-deploy-script
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** mPilot maintainer about to deploy contracts to Mantle Mainnet
**I want to** a step-by-step runbook covers: pre-deploy checks (CI green, audit findings closed, gas funding), the exact `forge script` command, post-deploy verification (Mantlescan source verification, on-chain `cast call` round-trip), addresses publication to `@mpilot/shared`, rollback procedure
**So that** the Mainnet deploy is reproducible by ANYONE on the team (or a future maintainer) and the deploy itself is the LEAST risky moment of the hackathon

---

## File modification map

- `docs/DEPLOY-MAINNET-RUNBOOK.md` — NEW — full runbook (the one referenced by story-19's commit message)
- `docs/DEPLOY-MAINNET-PRECHECK.md` — NEW — checklist signed before the deploy (must list: CI green, balance ≥ 0.5 MNT, env vars set, tx simulation passed)
- `scripts/preflight-mainnet.sh` — NEW — automated preflight script: checks `cast balance`, env vars, current Mantle gas price, exits 0 only when all green
- `scripts/postdeploy-verify-mainnet.sh` — NEW — post-deploy verification: `cast call` against each deployed contract, asserts expected return values
- `docs/DEPLOY-MAINNET-ROLLBACK.md` — NEW — rollback procedure (UUPS upgrade to a "paused" implementation; revoke session keys; emergency pause logic)

---

## Acceptance criteria (BDD)

```
Given DEPLOY-MAINNET-RUNBOOK.md exists
When read
Then it covers (in order): preflight checks, deploy command, post-deploy verification, addresses publication, rollback prep

Given the preflight script
When `bash scripts/preflight-mainnet.sh` runs
Then it: checks MNT balance ≥ 0.5, checks PRIVATE_KEY env var set, checks current gas price reasonable (< 2x median), exits 0 only when all pass

Given the preflight script
When ANY check fails
Then it exits 1 with a specific error message AND does NOT run the deploy (fail-fast)

Given the postdeploy verification script
When run after a successful deploy
Then it `cast call`s each deployed contract for a known view function (e.g., getVersion()) AND asserts the expected response

Given the addresses publication step
When the deploy completes
Then the runbook instructs the deployer to: (1) update packages/shared/src/addresses.ts with the new addresses, (2) commit with the deploy tx hash in the message, (3) push to main

Given the rollback runbook
When read
Then it covers: how to pause via UUPS (if pause function exists), how to revoke all session keys, how to redeploy a hot-fix, when to escalate to Mantle support

Given the runbook has explicit deploy command
When inspected
Then it shows the EXACT `forge script script/DeployMainnet.s.sol --rpc-url $MANTLE_RPC --broadcast --verify --etherscan-api-key $MANTLESCAN_API_KEY --slow --legacy` (or equivalent — verified working)

Given the runbook has a "no surprises" rule
When inspected
Then it explicitly states: "NEVER deploy on a Friday; NEVER deploy without preflight script green; NEVER deploy without a second pair of eyes if money is in play"

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
test -f docs/DEPLOY-MAINNET-RUNBOOK.md
test -f docs/DEPLOY-MAINNET-PRECHECK.md
test -f scripts/preflight-mainnet.sh
test -f scripts/postdeploy-verify-mainnet.sh
test -f docs/DEPLOY-MAINNET-ROLLBACK.md

# Preflight script is executable
test -x scripts/preflight-mainnet.sh
test -x scripts/postdeploy-verify-mainnet.sh

# Runbook documents the exact deploy command
grep -q "forge script" docs/DEPLOY-MAINNET-RUNBOOK.md
grep -q "MANTLE_RPC" docs/DEPLOY-MAINNET-RUNBOOK.md

# "No surprises" rule present
grep -qE "(never deploy|second pair of eyes)" docs/DEPLOY-MAINNET-RUNBOOK.md

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **THE RUNBOOK IS THE PROCESS.** Per CLAUDE.md no-silent-failures: a Mainnet deploy without a runbook is the LARGEST risk vector. Even a 1-developer team needs the runbook for the case "I deployed at 3am, forgot the verification step, and now Mantlescan shows red".
- **Preflight script exits non-zero on ANY check failure.** Fail-fast: cheaper to abort the deploy than to deploy with stale env vars.
- **MNT balance check ≥ 0.5 MNT** is the conservative bound. Mantle gas is cheap but the deploy + verification calls can spike. 0.5 MNT covers the deploy + 100 verification calls + the Aave setUserEMode call + buffer.
- **Gas price check < 2x median** prevents deploying during a gas spike. Mantle is usually stable but worth checking.
- **Address publication via PR** ensures the new addresses go through review. `packages/shared/src/addresses.ts` is the single source of truth (per CLAUDE.md). Don't hardcode anywhere else.
- **Rollback via UUPS upgrade** is the architecture choice from ADR-002. The runbook documents the upgrade procedure (deploy new implementation → upgrade proxy → verify on Mantlescan).
- **"Never deploy on Friday"** is the universal SRE rule. Mistakes compound over weekends with no support. Document it.
- **`forge script ... --verify --etherscan-api-key`** auto-verifies on Mantlescan. Skip this and the contract appears unverified — judges see red. CRITICAL.
- Cross-ref: story-19 (the deploy script this runs), ADR-002 (UUPS pattern), `archive/patron-2026-06-02/scripts/preflight-mainnet.sh` (predecessor's preflight pattern — reusable).
