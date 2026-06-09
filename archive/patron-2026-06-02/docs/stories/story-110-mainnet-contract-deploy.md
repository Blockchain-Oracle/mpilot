# Story 110 — Mainnet contract deploy + Mantlescan verification + addresses.ts Mainnet entries

**Epic:** Epic 8 — Polish + Submit
**Estimated:** ~2h
**Depends on:** story-21-sepolia-deployment, story-53-agent-test-fixtures

## BDD Acceptance Criteria

```
Given env vars MANTLE_RPC_URL=https://rpc.mantle.xyz + OPS_PRIVATE_KEY (with ≥ 0.3 $MNT) + MANTLESCAN_API_KEY are set
And the operator confirms via interactive prompt: "Type DEPLOY-MAINNET to continue"
When `forge script script/DeployAll.s.sol --rpc-url $MANTLE_RPC_URL --broadcast --verify --verifier-url https://api.mantlescan.xyz/api --etherscan-api-key $MANTLESCAN_API_KEY` runs
Then exit code is 0
And the broadcast artifact at packages/contracts/broadcast/DeployAll.s.sol/5000/run-latest.json exists with 4 CREATE transactions
And each contract is verified on mantlescan.xyz (status check via Mantlescan API: getsourcecode returns non-empty SourceCode for each address)

Given the deployment succeeds
When `node packages/contracts/scripts/write-addresses.mjs --network mainnet` runs
Then packages/shared/src/addresses.ts has its `mainnet` block populated with 4 0x-prefixed addresses
And the existing `sepolia` block is preserved unchanged
And `pnpm typecheck` exits 0

Given the deploy script gate is in place
When the script reads block.chainid
Then it requires block.chainid == 5000 for Mainnet runs (and refuses to broadcast if mismatched)
And the same script with chainid 5003 deploys to Sepolia (story-21 path)

Given role wiring runs as part of the deployment
When the broadcast completes
Then:
  - ReputationProxy.AGENT_ROLE has been granted to PatronVault
  - PatronVault.AGENT_ROLE has been granted to AgentAuthorizer
  - MerchantRegistry.ADMIN_ROLE remains with the OPS deployer (rotatable later)
And a post-deploy smoke script (`scripts/postdeploy-smoke.mjs`) runs read-only checks against each Mainnet address:
  - PatronVault.aavePool() == 0x458F293454fE0d67EC0655f3672301301DD51422
  - PatronVault.collateralToken() == sUSDe Mantle 0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2
  - PatronVault.debtToken() == USDC Mantle 0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9
  - ReputationProxy.identityRegistry() == 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
  - ReputationProxy.reputationRegistry() == 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
And exit code is 0

Given the README is updated
When a reader opens README.md
Then the "Deployed contracts" section has a Mainnet table with 4 real 0x-prefixed addresses
And each address links to https://mantlescan.xyz/address/<addr>#code
And no 0x000... placeholder remains
```

## File modification map

- `packages/contracts/script/DeployAll.s.sol` — UPDATE (already created in story-21) — add explicit chain-id guard: `require(block.chainid == 5000 || block.chainid == 5003, "unsupported chain");` ; route per-chain dependency addresses via `HelperConfig.s.sol`
- `packages/contracts/script/HelperConfig.s.sol` — UPDATE (already exists from story-21) — populate the Mainnet (5000) section with:
  - Aave V3 Pool: `0x458F293454fE0d67EC0655f3672301301DD51422`
  - sUSDe: `0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2`
  - USDC: `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`
  - ERC-8004 Identity Registry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
  - ERC-8004 Reputation Registry: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
  - Aave Oracle aggregator: `0x47a063CfDa980532267970d478EC340C0F80E8df` (per ADR-003 — single source of on-chain price truth on Mantle; no direct Chainlink sUSDe/USD feed exists, so we read sUSDe + USDC via `IAaveOracle.getAssetPrice` which internally routes to the "Capped sUSDe/USDT/USD" composite at `0x8b47EC48ac560793861D94A997d020872c1cE3f5` for sUSDe and "Capped USDC/USD" at `0x3876FB349c14613e0633b5cAe08C4E3B1d4904fB` for USDC; USDC peg also hardcoded at $1 in PatronVault per ADR-003)
- `packages/contracts/scripts/write-addresses.mjs` — UPDATE (already created in story-21) — accept `--network mainnet|sepolia` flag; read from `broadcast/DeployAll.s.sol/5000/run-latest.json` for Mainnet; merge into `mainnet` block of `addresses.ts`; preserve the other network's existing entries
- `packages/contracts/scripts/postdeploy-smoke.mjs` — NEW — Node ESM. Uses viem readContract against each deployed Mainnet address. Verifies dependency wiring + role grants. Exits non-zero on any mismatch.
- `packages/contracts/scripts/deploy-mainnet.sh` — NEW — interactive wrapper: prints checklist, prompts for `DEPLOY-MAINNET` confirmation, runs `forge script` with the right flags, then runs `write-addresses.mjs --network mainnet`, then runs `postdeploy-smoke.mjs`, then prints next-step (story-111)
- `packages/shared/src/addresses.ts` — UPDATE — Mainnet block populated by the write-addresses script
- `README.md` — UPDATE — "Deployed contracts" table: Mainnet column filled with mantlescan.xyz links
- `docs/DEPLOY-MAINNET-RUNBOOK.md` — NEW — step-by-step runbook covering pre-flight (gas balance, env vars, last green CI), the deploy command, post-deploy verification, rollback strategy (rare: contracts are immutable, so "rollback" means re-deploy + repoint via addresses.ts + flag old addresses as `deprecated` in README)

## Shell verification

```bash
cd packages/contracts

# Pre-flight
test -n "$MANTLE_RPC_URL"
test -n "$OPS_PRIVATE_KEY"
test -n "$MANTLESCAN_API_KEY"

# Confirm $MNT balance
cast balance --rpc-url $MANTLE_RPC_URL $(cast wallet address $OPS_PRIVATE_KEY) | awk '{if ($1 < 300000000000000000) exit 1}'

# Interactive deploy (uses wrapper script)
bash scripts/deploy-mainnet.sh
test $? -eq 0

# Broadcast artifact exists with 4 CREATEs
test -f broadcast/DeployAll.s.sol/5000/run-latest.json
jq '.transactions | map(select(.transactionType == "CREATE")) | length' broadcast/DeployAll.s.sol/5000/run-latest.json | xargs test 4 -le

# addresses.ts has mainnet block, no placeholders
cd ../../
node -e "
  const m = require('./packages/shared/src/addresses.ts');
  const a = m.ADDRESSES.mainnet;
  for (const k of ['PatronVault','MerchantRegistry','ReputationProxy','AgentAuthorizer']) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(a[k]) || a[k].toLowerCase() === '0x0000000000000000000000000000000000000000') { console.error('Bad addr', k, a[k]); process.exit(1); }
  }
"

# Mantlescan verification status
for c in PatronVault MerchantRegistry ReputationProxy AgentAuthorizer; do
  addr=$(node -e "console.log(require('./packages/shared/src/addresses.ts').ADDRESSES.mainnet.$c)")
  curl -s "https://api.mantlescan.xyz/api?module=contract&action=getsourcecode&address=$addr&apikey=$MANTLESCAN_API_KEY" | jq -e '.result[0].SourceCode | length > 0'
done

# Post-deploy smoke
node packages/contracts/scripts/postdeploy-smoke.mjs --network mainnet
test $? -eq 0

# README populated with mantlescan links (no 0x000)
grep -A 12 "Deployed contracts" README.md | grep -c "mantlescan.xyz/address/0x" | xargs test 4 -le
grep -A 12 "Deployed contracts" README.md | grep -v "0x0000000000000000000000000000000000000000"

pnpm typecheck
test $? -eq 0
```

## Notes

- **Deadline-critical.** Per epics.md + PRD: Mainnet deploy must be green by Day 12 (2026-06-12) — submission cutoff is 2026-06-15 15:59 UTC. Buffer is intentional so anything that breaks here can be re-attempted.
- Use the **interactive wrapper script** for Mainnet runs. Mainnet broadcasts spend real $MNT and create immutable artifacts; no `--force` paths.
- **Chain id 5000 vs 5003 enforcement** prevents "I meant Sepolia, hit Mainnet" disasters (and vice versa). The deploy script reads `block.chainid` and refuses mismatched runs.
- Role wiring happens INSIDE the same `vm.startBroadcast` block so it can't be forgotten between deploy + role-grant steps. If the wiring fails after deploys succeed, the contracts exist but can't be used — the smoke script catches this.
- **Oracle source on Mantle (per ADR-003, REVISED 2026-06-03 via AUDIT-1):** there is NO direct Chainlink sUSDe/USD feed on Mantle. We read sUSDe + USDC prices through the Aave Oracle aggregator at `0x47a063CfDa980532267970d478EC340C0F80E8df`, which routes internally to the "Capped sUSDe/USDT/USD" composite for sUSDe and "Capped USDC/USD" for USDC. This is the SAME oracle Aave Mantle uses for its own liquidation math, so our health-factor checks align with Aave's (we cannot get liquidated on a price our contract didn't see). USDC peg also hardcoded at $1 in PatronVault as defense-in-depth. Document the choice in `HelperConfig.s.sol` comments + the DEPLOY-MAINNET-RUNBOOK; do NOT add a fallback Chainlink path because the feeds the fallback would target don't exist.
- Mantlescan verification API: same Etherscan API surface as Sepolia. The verification can take 30-120s after each contract deploy — the script polls `getsourcecode` until non-empty SourceCode appears.
- The README "Deployed contracts" section is a HARD submission requirement (PRD § Required submission artifacts, DoraHacks Deployment Award rubric). Verify it's populated BEFORE story-117 (DoraHacks submission) runs.
- After this story, story-111 (Mainnet merchant onboarding) can run; that story re-uses the onboard-demo-merchants.mjs script with `--network mainnet`.
- File size < 400 LOC per file.
