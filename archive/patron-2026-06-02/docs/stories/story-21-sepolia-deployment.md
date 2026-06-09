# Story 21 — Foundry deploy script + Mantle Sepolia deployment + Mantlescan verification + addresses.ts

**Epic:** Epic 1 — Smart Contracts
**Estimated:** ~2h
**Depends on:** story-12-patron-vault-tests-unit, story-14-patron-vault-tests-invariant, story-16-merchant-registry-tests, story-18-reputation-proxy-tests, story-20-agent-authorizer-tests, story-22-susde-emode-setup, story-06-env-and-secrets-setup

## BDD Acceptance Criteria

```
Given env vars MANTLE_SEPOLIA_RPC_URL, OPS_PRIVATE_KEY, MANTLESCAN_API_KEY are set
When `forge script script/DeployAll.s.sol --rpc-url $MANTLE_SEPOLIA_RPC_URL --broadcast --verify --etherscan-api-key $MANTLESCAN_API_KEY` runs
Then exit code is 0
And four contracts (PatronVault, MerchantRegistry, ReputationProxy, AgentAuthorizer) are deployed
And each is verified on sepolia.mantlescan.xyz (verify step exits 0)
And the broadcast artifact at packages/contracts/broadcast/DeployAll.s.sol/5003/run-latest.json contains four `CREATE` transactions

Given the deployment succeeds
When `node packages/contracts/scripts/write-addresses.mjs` runs
Then packages/shared/src/addresses.ts is updated with the four Sepolia addresses
And the file exports `export const ADDRESSES = { sepolia: { PatronVault: '0x...', MerchantRegistry: '0x...', ReputationProxy: '0x...', AgentAuthorizer: '0x...' }, mainnet: { ... } }`
And `pnpm typecheck` exits 0 (the new addresses don't break consumers)

Given the addresses.ts file is committed
When any other package imports `import { ADDRESSES } from '@patron/shared'`
Then it resolves to a non-empty 0x-prefixed string for every contract on chainId 5003
And `node -e "import('./packages/shared/src/index.js').then(m => Object.values(m.ADDRESSES.sepolia).forEach(a => { if (!/^0x[a-fA-F0-9]{40}$/.test(a)) process.exit(1) }))"` exits 0

Given the README is updated
When a reader opens README.md
Then it contains the four Sepolia addresses under a "Deployed contracts" section
And each address links to its sepolia.mantlescan.xyz page
And no `0x000` placeholder remains (per architecture.md banned patterns)
```

## File modification map

- `packages/contracts/script/DeployAll.s.sol` — NEW — `forge-std/Script.sol` deploy script. Reads `HelperConfig.s.sol` for per-chain addresses (Aave Pool, sUSDe, USDC, **Aave Oracle aggregator** per ADR-003, ERC-8004 registries). Deploys in order: (1) `ReputationProxy` with ERC-8004 registry addresses; (2) `MerchantRegistry` with USDC address; (3) `AgentAuthorizer` with Identity Registry address; (4) `PatronVault` with all of the above. Wires roles: PatronVault gets `AGENT_ROLE` on ReputationProxy; AgentAuthorizer gets `AGENT_ROLE` on PatronVault. Calls `vm.startBroadcast` / `stopBroadcast` around all deployments.
- `packages/contracts/scripts/write-addresses.mjs` — NEW — Node ESM script. Reads `packages/contracts/broadcast/DeployAll.s.sol/<chainId>/run-latest.json`, extracts CREATE addresses keyed by contract name, merges into `packages/shared/src/addresses.ts` (preserves any pre-existing Mainnet entries; replaces Sepolia entries on the target chainId). Idempotent.
- `packages/shared/src/addresses.ts` — UPDATE (file already scaffolded in story-00) — typed export with strict shape: `{ sepolia: Record<ContractName, Address>; mainnet: Record<ContractName, Address> }` where `ContractName = 'PatronVault' | 'MerchantRegistry' | 'ReputationProxy' | 'AgentAuthorizer'` and `Address = \`0x${string}\``
- `packages/shared/src/index.ts` — UPDATE — re-export `ADDRESSES` + the `ContractName` type so downstream packages can import once
- `packages/contracts/script/HelperConfig.s.sol` — UPDATE — populate chainId 5003 (Sepolia) section with the exact Mantle addresses from architecture.md
- `packages/contracts/script/.env.example` — NEW — script-local env template documenting MANTLE_SEPOLIA_RPC_URL, OPS_PRIVATE_KEY, MANTLESCAN_API_KEY (cross-refs root `.env.example` from story-06)
- `README.md` — UPDATE — add "Deployed contracts" section with Sepolia + Mainnet (Mainnet remains `pending` until story-110) tables and mantlescan links
- `.github/workflows/deploy-preview.yml` — UPDATE — add a `contracts-sepolia` job that runs the deploy script on PR merge to a `deploy/*` branch (manual gate; do not run on every PR)

## Shell verification

```bash
cd packages/contracts

# Pre-flight: required env present
test -n "$MANTLE_SEPOLIA_RPC_URL"
test -n "$OPS_PRIVATE_KEY"
test -n "$MANTLESCAN_API_KEY"

# Deploy
forge script script/DeployAll.s.sol \
  --rpc-url $MANTLE_SEPOLIA_RPC_URL \
  --private-key $OPS_PRIVATE_KEY \
  --broadcast \
  --verify \
  --verifier-url https://api-sepolia.mantlescan.xyz/api \
  --etherscan-api-key $MANTLESCAN_API_KEY
test $? -eq 0

# Broadcast artifact present
test -f broadcast/DeployAll.s.sol/5003/run-latest.json
jq '.transactions | map(select(.transactionType == "CREATE")) | length' broadcast/DeployAll.s.sol/5003/run-latest.json | xargs test 4 -le

# Sync to addresses.ts
node scripts/write-addresses.mjs

# Verify addresses.ts shape (use tsx — Node cannot load .ts at runtime)
cd ../../
npx tsx -e "
  import { ADDRESSES } from './packages/shared/src/addresses.ts';
  const addr = ADDRESSES.sepolia;
  for (const k of ['PatronVault','MerchantRegistry','ReputationProxy','AgentAuthorizer']) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr[k])) { console.error('Bad addr for', k); process.exit(1); }
  }
"

# Typecheck still green
pnpm turbo run typecheck
test $? -eq 0

# README has Sepolia table populated (no 0x000)
grep -A 12 "Deployed contracts" README.md | grep -v "0x0000000000000000000000000000000000000000"
```

## Notes

- Per architecture.md "Mantle-specific details":
  - Sepolia RPC: `https://rpc.sepolia.mantle.xyz`
  - Sepolia explorer: `sepolia.mantlescan.xyz`
  - Sepolia chainId: **5003**
  - Sepolia faucet: `https://faucets.chain.link/mantle-sepolia` (get $MNT for gas)
- Mantlescan verification API endpoint: `https://api-sepolia.mantlescan.xyz/api` for Sepolia; `https://api.mantlescan.xyz/api` for Mainnet. Use Foundry's `--verifier etherscan` (Mantlescan exposes the Etherscan API surface).
- `OPS_PRIVATE_KEY` per `story-06`: fresh wallet, NEVER reuse personal. Hackathon use only; rotate after demo.
- Deploy ORDER matters because of role wiring:
  1. ReputationProxy (no deps)
  2. MerchantRegistry (deps: USDC)
  3. AgentAuthorizer (deps: Identity Registry)
  4. PatronVault (deps: Aave Pool, sUSDe, USDC, Aave Oracle aggregator, ReputationProxy, MerchantRegistry, AgentAuthorizer)
  Then: grant `PatronVault` the `AGENT_ROLE` on ReputationProxy; grant `AgentAuthorizer` the `AGENT_ROLE` on PatronVault.
- Mainnet deploy is **story-110** (Epic 8). DO NOT deploy to Mainnet from this story even by accident — gate via chainId check in `DeployAll.s.sol`: `require(block.chainid == 5003, "This story deploys Sepolia only")`.
- Per architecture.md "Banned patterns": no hardcoded contract addresses outside `packages/shared/addresses.ts`. The `write-addresses.mjs` script is what makes that rule enforceable — every other package imports from `@patron/shared`.
- README "Deployed contracts" section is also a submission requirement (per PRD "Required submission artifacts": README must include "deployed contract addresses (real, not 0x000)").
- After this story is green, Epic 2's backend (`/orders/intent`, indexer) and Epic 3's agent tool layer can both consume real on-chain addresses — Epic 1 is the unblocker for everything downstream.
- File MUST stay under 400 LOC.
