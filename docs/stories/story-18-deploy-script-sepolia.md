# Story — `DeployAll.s.sol` Sepolia path (mocks + registry + verify)

**ID:** story-18-deploy-script-sepolia
**Epic:** Epic E1 — Smart Contracts
**Depends on:** story-17-helper-config, story-10-concierge-registry-base
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** mPilot maintainer
**I want to** a single `forge script script/DeployAll.s.sol --rpc-url $MANTLE_SEPOLIA_RPC_URL --broadcast --verify` command deploys all 4 mocks + MockAaveOracle + ConciergeRegistry to Sepolia, verifies them on Mantlescan, and writes the addresses back to `packages/shared/src/addresses.ts`
**So that** a Sepolia playground refresh is one command, not a 30-minute manual sequence

---

## File modification map

- `contracts/script/DeployAll.s.sol` — NEW — `forge-std/Script.sol` deploy script. Reads `HelperConfig.s.sol` (chain-routed). On Sepolia (chainid 5003): deploys 4 mock tokens + MockAaveOracle (with seed prices) + MockAavePool (reading mock token + oracle addresses) + ConciergeRegistry (UUPS proxy + impl). Calls `vm.startBroadcast()` / `vm.stopBroadcast()` around the deployments. Emits structured logs for downstream `write-addresses.mjs` to parse.
- `contracts/script/SeedSepolia.s.sol` — NEW — separate script run AFTER DeployAll on Sepolia. Mints demo balances to a seed account (10K USDC, 1K sUSDe, 100 USDY, 1 mETH) — bypasses faucet cap via admin `mint()`. Useful for the e2e demo flow.
- `contracts/scripts/write-addresses.mjs` — NEW — Node ESM script. Reads `contracts/broadcast/DeployAll.s.sol/5003/run-latest.json` (Foundry broadcast artifact). Extracts the deployed contract addresses. Merges them into `packages/shared/src/addresses.ts` (preserving the `mainnet` block untouched, updating only the `sepolia` block). Runs `pnpm run typecheck` after to verify the file is still valid.
- `contracts/scripts/verify-sepolia.sh` — NEW — bash wrapper that loops over deployed contracts and calls `forge verify-contract` for each (Mantlescan Sepolia API). Idempotent.

---

## Acceptance criteria (BDD)

```
Given the deploy script is invoked against Mantle Sepolia
When `forge script script/DeployAll.s.sol --rpc-url $MANTLE_SEPOLIA_RPC_URL --broadcast --verify` runs
Then exit code is 0 AND `contracts/broadcast/DeployAll.s.sol/5003/run-latest.json` exists with > 7 CREATE transactions

Given the broadcast artifact exists
When `node contracts/scripts/write-addresses.mjs --network sepolia` runs
Then `packages/shared/src/addresses.ts` is updated with the deployed Sepolia addresses (mock tokens, oracle, pool, ConciergeRegistry), the `mainnet` block is byte-for-byte unchanged, and `pnpm run typecheck` exits 0

Given the verify script runs after deploy
When `bash contracts/scripts/verify-sepolia.sh` runs
Then every deployed contract returns non-empty `SourceCode` from Mantlescan Sepolia API within 120 seconds

Given the seed script runs after DeployAll
When `forge script script/SeedSepolia.s.sol --rpc-url $MANTLE_SEPOLIA_RPC_URL --broadcast` runs
Then the configured seed account holds 10000e6 USDC, 1000e18 sUSDe, 100e18 USDY, and 1e18 mETH (asserted via cast call post-run)

Given the deploy was on Sepolia (chainid 5003)
When the script reads `block.chainid`
Then it routes to the Sepolia branch of HelperConfig and uses mock addresses; the Mainnet path is NOT triggered

Given the deploy was attempted with `--rpc-url` pointing to Mainnet (chainid 5000) but the script was intended for Sepolia
When the script runs
Then it deploys to MAINNET (chainid 5000 path of HelperConfig); operator confirmation gate (story-19) is the safeguard against accidental Mainnet deploys

Given an idempotent re-run
When DeployAll runs twice on the same private key
Then the second run deploys NEW contracts (CREATE bumps the nonce); the broadcast file shows both runs; write-addresses.mjs uses the latest run-latest.json
```

---

## Shell verification

```bash
cd contracts

# Pre-flight env vars
test -n "$MANTLE_SEPOLIA_RPC_URL"
test -n "$OPS_PRIVATE_KEY"
test -n "$MANTLESCAN_SEPOLIA_API_KEY"

# Deploy ran cleanly
test -f broadcast/DeployAll.s.sol/5003/run-latest.json

# At least 7 CREATE txs (4 mocks + 1 oracle + 1 pool + ConciergeRegistry impl + proxy)
jq '.transactions | map(select(.transactionType == "CREATE")) | length' broadcast/DeployAll.s.sol/5003/run-latest.json | awk '$1 >= 7 {exit 0} {exit 1}'

# Addresses written to shared package
cd ..
node -e "
  const m = require('./packages/shared/src/addresses.ts');
  const s = m.ADDRESSES.sepolia;
  for (const k of ['aavePool','aaveOracle','sUSDe','USDC','USDY','mETH','conciergeRegistry']) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(s[k])) { console.error('bad addr', k, s[k]); process.exit(1); }
    if (s[k].toLowerCase() === '0x0000000000000000000000000000000000000000') { console.error('zero addr', k); process.exit(1); }
  }
"
pnpm run typecheck
test $? -eq 0

# Verification succeeded on Mantlescan Sepolia (loop over addresses)
cd contracts
for c in MockAavePool MockSUSDe MockUSDC MockUSDY MockMETH MockAaveOracle ConciergeRegistry; do
  addr=$(node -e "console.log(require('../packages/shared/src/addresses.ts').ADDRESSES.sepolia.${c,,})")
  curl -sf "https://api-sepolia.mantlescan.xyz/api?module=contract&action=getsourcecode&address=$addr&apikey=$MANTLESCAN_SEPOLIA_API_KEY" \
    | jq -e '.result[0].SourceCode | length > 0' || { echo "$c not verified"; exit 1; }
done
```

---

## Notes for coding agent

- **Reuse Patron pattern.** Reference: `archive/patron-2026-06-02/docs/stories/story-21-sepolia-deployment.md` for the deploy structure + `archive/patron-2026-06-02/docs/stories/story-23-deploy-demo-mocks-sepolia.md` for the mock-deploy specifics. Different contracts, same shape.
- **Order matters:** mock tokens FIRST (no deps), then MockAaveOracle (no deps but needs token addresses for seeding), then MockAavePool (depends on tokens + oracle), then ConciergeRegistry (independent). Get the order wrong and you have circular deploy calls.
- **`--verify` flag on `forge script`** does the Mantlescan verification automatically using the API key from `[etherscan]` block in `foundry.toml`. The separate `verify-sepolia.sh` is a fallback for failed in-line verifications (Mantlescan can be flaky; polling+retry handles it).
- **`write-addresses.mjs`** uses `babel-parser` or `recast` to do a structured AST update of the TS file — NOT regex replace. Regex would corrupt the file on the second run if addresses contained certain hex patterns. Reference: `find-evil/scripts/write_addresses.py` (Python equivalent) for the AST-safe pattern.
- **Seed account is a separate `OPS_PRIVATE_KEY`** — never the deployer's main key. Documented in `apps/web/.env.example` (from story-24).
- **No `--legacy` flag needed** on Mantle (it supports EIP-1559).
- **MNT gas balance pre-flight** — script should `vm.assertGe(addr.balance, 0.1e18)` before broadcasting to fail fast on under-funded deploys.
- File MUST stay under 400 LOC. If `DeployAll.s.sol` approaches limit, extract deploy primitives to `script/lib/Deployers.sol`.
- Cross-ref: ADR-012 (Sepolia mock-deploy strategy), `research/concierge/03-providers/_SUMMARY.md` for the address registry shape.
