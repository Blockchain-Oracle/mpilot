# Story — `DeployAll.s.sol` Mainnet path + interactive `DEPLOY-MAINNET` gate

**ID:** story-19-deploy-script-mainnet-gated
**Epic:** Epic E1 — Smart Contracts
**Depends on:** story-18-deploy-script-sepolia
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** mPilot maintainer doing the production Mainnet deploy
**I want to** an interactive wrapper script demands typing `DEPLOY-MAINNET` exactly before broadcasting, then runs the same `DeployAll.s.sol` against Mantle Mainnet, verifies on Mantlescan, writes addresses, and runs a postdeploy smoke check
**So that** accidental Mainnet broadcasts (the script is the same — only chain id differs) are impossible without explicit human confirmation, and a successful deploy produces a complete artifact set (verified addresses + smoke-test green) on first try

---

## File modification map

- `contracts/scripts/deploy-mainnet.sh` — NEW — interactive bash wrapper. Steps:
  1. Pre-flight checks: env vars set (`MANTLE_RPC_URL`, `OPS_PRIVATE_KEY`, `MANTLESCAN_API_KEY`), $MNT balance ≥ 0.3, last green CI run on `main` (via `gh run list`), no uncommitted changes
  2. Print summary: "About to deploy mPilot to Mantle Mainnet. Real $MNT will be spent. Mainnet contracts cannot be undeployed."
  3. Prompt: `Type DEPLOY-MAINNET to continue:` — exact string match, NOT y/N (y/N is fat-finger-able). Anything else aborts.
  4. Run `forge script script/DeployAll.s.sol --rpc-url $MANTLE_RPC_URL --broadcast --verify --verifier-url https://api.mantlescan.xyz/api --etherscan-api-key $MANTLESCAN_API_KEY`
  5. Run `node contracts/scripts/write-addresses.mjs --network mainnet`
  6. Run `node contracts/scripts/postdeploy-smoke.mjs` — read-only sanity checks
  7. Print next steps: "Run story-194 (deploy MCP server) and story-200 (finalize README)"
- `contracts/scripts/postdeploy-smoke.mjs` — NEW — Node ESM. Reads `packages/shared/src/addresses.ts` Mainnet block. Uses viem `readContract` to verify:
  - ConciergeRegistry: `nextAgentId() == 1` (fresh deploy, no agents yet); `hasRole(ADMIN_ROLE, deployer) == true`
  - ERC-8004 Identity Registry on Mainnet still returns `name() == "AgentIdentity"` (sanity check the external dep wiring)
  - Aave V3 Pool is reachable: `Pool.ADDRESSES_PROVIDER()` returns the expected provider
- `contracts/script/DeployAll.s.sol` — UPDATE (created in story-18) — add a chainid guard: `require(block.chainid == 5000 || block.chainid == 5003, "DeployAll: unsupported chain id");` (defense-in-depth even with the wrapper script)
- `docs/DEPLOY-MAINNET-RUNBOOK.md` — NEW — operator runbook: pre-flight checklist, what each step does, rollback strategy (Mainnet contracts are immutable — "rollback" means deploy new + repoint + flag old as deprecated in README), monitoring + post-deploy verification

---

## Acceptance criteria (BDD)

```
Given the deploy script is invoked WITHOUT typing the exact confirmation
When the user types "yes" or "y" or anything other than "DEPLOY-MAINNET"
Then the script aborts before any broadcast, exit code is 1, and no transactions are sent

Given the env vars are missing
When the wrapper script runs
Then it fails fast at the pre-flight step naming the missing var, exit code 1

Given $MNT balance is below 0.3
When the wrapper script's pre-flight runs
Then it fails with "Insufficient $MNT for deploy (need ≥ 0.3, have X)" and exit code 1

Given the wrapper is invoked from a dirty git tree
When the pre-flight runs
Then it aborts with "Uncommitted changes — commit or stash first"

Given the user types DEPLOY-MAINNET exactly
When the script runs full sequence
Then `forge script` broadcasts, the broadcast artifact at `contracts/broadcast/DeployAll.s.sol/5000/run-latest.json` is created with ≥ 2 CREATE transactions (ConciergeRegistry impl + proxy), addresses are written to `packages/shared/src/addresses.ts` Mainnet block, and postdeploy-smoke exits 0

Given DeployAll.s.sol has the chainid guard
When forge tries to run it against chainid 1 (Ethereum Mainnet) by mistake
Then it reverts with the require message — never touches the chain

Given postdeploy-smoke runs
When `node contracts/scripts/postdeploy-smoke.mjs` runs against the freshly deployed ConciergeRegistry
Then ALL assertions pass: nextAgentId == 1, ADMIN_ROLE held by deployer, Pool reachable, ERC-8004 Identity name unchanged

Given Mantlescan verification succeeds
When the user navigates to https://mantlescan.xyz/address/<ConciergeRegistry>#code
Then the contract source is visible (asserted automatically via API in the wrapper script)
```

---

## Shell verification

```bash
cd contracts

# Wrapper script exists + executable
test -x scripts/deploy-mainnet.sh
test -f scripts/postdeploy-smoke.mjs

# Wrapper enforces exact confirmation string
echo "y" | bash scripts/deploy-mainnet.sh 2>&1 | grep -q "DEPLOY-MAINNET" || true  # should error
test $? -ne 0 || { echo "wrapper accepted non-exact confirmation"; exit 1; }

# DeployAll guards on chainid
grep -q "block.chainid == 5000 || block.chainid == 5003" script/DeployAll.s.sol

# Runbook exists with required sections
test -f ../docs/DEPLOY-MAINNET-RUNBOOK.md
for section in "Pre-flight" "Deploy command" "Post-deploy verification" "Rollback strategy"; do
  grep -q "$section" ../docs/DEPLOY-MAINNET-RUNBOOK.md || { echo "missing section: $section"; exit 1; }
done

# postdeploy-smoke is a real script that exits 0 on a properly deployed contract (run via integration test)
# When run before deploy, it should fail loudly (no addresses)
cd ..
node contracts/scripts/postdeploy-smoke.mjs 2>&1 | grep -q "addresses not yet populated" || true
```

---

## Notes for coding agent

- **The exact-string confirmation is intentional friction.** `y/N` is fat-finger-able; pasting code that includes a `y` somewhere can accidentally confirm. `DEPLOY-MAINNET` requires deliberate typing — Mainnet contracts are immutable; the friction is worth it. Reference: `archive/patron-2026-06-02/docs/stories/story-110-mainnet-contract-deploy.md` for the predecessor pattern.
- **Chainid guard in `DeployAll.s.sol`** is defense-in-depth. The wrapper script enforces it at the operator level; the contract enforces it at the EVM level. If someone runs `forge script` directly (bypassing the wrapper) with the wrong RPC, the contract refuses to deploy.
- **`--verify --verifier-url`** does verification inline with broadcast. Mantlescan can take 30-120 seconds to index a fresh deploy; the script polls. If the inline verification fails, the wrapper falls back to `verify-sepolia.sh`-style retry pattern.
- **`postdeploy-smoke.mjs` is the canary**, NOT a full integration test. It reads on-chain state via viem and asserts known values (`nextAgentId == 1` after a fresh deploy, role grants, dependency wiring). If smoke fails, the deploy is broken — surface to operator before they move on to story-194 (MCP deploy).
- **The runbook** documents the full sequence including pre-deploy checks (CI green, no pending PRs touching contracts, gas price reasonable) and post-deploy actions (update README addresses table, archive deploy artifact to `docs/deployments/2026-XX-XX-mainnet.md`).
- **Rollback strategy for immutable Mainnet:** "rollback" means deploy a NEW ConciergeRegistry, update `packages/shared/src/addresses.ts`, flag the old address as `deprecated` in the README. The UUPS proxy from story-10 lets us upgrade the LOGIC without redeploying the proxy — most "rollbacks" are upgrades-in-place via `_authorizeUpgrade`.
- **No `--legacy` flag** — Mantle supports EIP-1559 like Sepolia.
- **`OPS_PRIVATE_KEY` is the Mainnet OPS multisig signer** for the v0 deploy — eventually graduates to a Safe multisig (post-hackathon). Documented in the runbook + `DEPLOY-MAINNET-RUNBOOK.md`.
- Cross-ref: ADR-012 (chain-id routing), story-18 (Sepolia path that this story mirrors with the Mainnet gate added).
- File MUST stay under 400 LOC.
