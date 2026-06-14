# Story — Shared ABI imports (Aave V3 + ERC-8004 + viem)

**ID:** story-21-shared-abi-imports
**Epic:** Epic E2 — Shared SDK Core
**Depends on:** story-20-shared-package-bootstrap
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge provider author
**I want to** import canonical ABIs from `@concierge-mantle/shared` without copying JSON
**So that** every package uses the same source-of-truth ABI

---

## File modification map

- `packages/shared/src/abi/index.ts` — NEW — barrel exports
- `packages/shared/src/abi/aave-v3.ts` — NEW — `ipoolAbi` (IPool) + `iaaveOracleAbi` exports (use viem `parseAbi` or static ABI from `@aave-dao/aave-address-book` if available)
- `packages/shared/src/abi/erc8004.ts` — NEW — `identityRegistryAbi` + `reputationRegistryAbi` (fetched from `erc-8004/erc-8004-contracts/abis/`)
- `packages/shared/src/abi/erc20.ts` — NEW — minimal ERC-20 ABI (balanceOf, transfer, approve, allowance, decimals, symbol)
- `packages/shared/src/abi/zerodev-kernel.ts` — NEW — Kernel v3.1 minimal ABI (`execute`, `executeBatch`)
- `packages/shared/scripts/fetch-abis.mjs` — NEW — script that fetches ERC-8004 ABIs from GitHub canonical repo, writes to `src/abi/erc8004-*.json` (committed for offline build)
- `packages/shared/src/abi/erc8004-IdentityRegistry.json` — NEW (generated) — committed for offline build
- `packages/shared/src/abi/erc8004-ReputationRegistry.json` — NEW (generated) — committed for offline build
- `packages/shared/src/abi/index.test.ts` — NEW — ABI sanity tests (selector hashes match expected)

---

## Acceptance criteria (BDD)

```
Given Aave V3 ABI is exported
When `pnpm -e "import { ipoolAbi } from './packages/shared/src/abi/index.ts'; console.log(ipoolAbi.filter(i => i.name === 'supply').length)"` runs
Then output is 1 (one supply function in the IPool ABI)

Given Aave V3 ABI has setUserEMode
When grep on the exported ABI checks for `setUserEMode` function
Then output is non-empty

Given Aave V3 ABI has getUserAccountData (read function)
When grep on the exported ABI checks
Then output is non-empty

Given ERC-8004 Identity Registry ABI is fetched
When `pnpm -e "import abi from './packages/shared/src/abi/erc8004-IdentityRegistry.json' assert { type: 'json' }; console.log(abi.filter(i => i.type === 'function' && i.name === 'register').length)"` runs
Then output is ≥ 1 (at least one register function)

Given ERC-8004 Reputation Registry ABI has giveFeedback
When the test asserts `giveFeedback` exists with int128 + uint8 inputs
Then exit code is 0

Given the fetch-abis script runs
When `node packages/shared/scripts/fetch-abis.mjs` runs
Then exit code is 0 and the JSON files are written

Given ABI tests pass
When `pnpm test packages/shared/src/abi/index.test.ts` runs
Then ≥ 6 test cases pass
```

---

## Shell verification

```bash
test -f packages/shared/src/abi/index.ts
test -f packages/shared/src/abi/aave-v3.ts
test -f packages/shared/src/abi/erc8004.ts
test -f packages/shared/src/abi/erc20.ts
test -f packages/shared/scripts/fetch-abis.mjs
test -f packages/shared/src/abi/erc8004-IdentityRegistry.json
test -f packages/shared/src/abi/erc8004-ReputationRegistry.json

# IPool ABI has the right functions
bun -e "
  import { ipoolAbi } from './packages/shared/src/abi/index.ts';
  const fns = ['supply','borrow','repay','withdraw','setUserEMode','getUserAccountData','getReserveData','getEModeCategoryData'];
  for (const f of fns) {
    if (!ipoolAbi.find(i => i.type === 'function' && i.name === f)) {
      console.error('Missing IPool function:', f);
      process.exit(1);
    }
  }
"

# IAaveOracle has getAssetPrice
bun -e "
  import { iaaveOracleAbi } from './packages/shared/src/abi/index.ts';
  if (!iaaveOracleAbi.find(i => i.type === 'function' && i.name === 'getAssetPrice')) process.exit(1);
"

# ERC-8004 ABIs have required functions
node -e "
  const id = require('./packages/shared/src/abi/erc8004-IdentityRegistry.json');
  const rep = require('./packages/shared/src/abi/erc8004-ReputationRegistry.json');
  if (!id.find(i => i.name === 'register')) process.exit(1);
  if (!id.find(i => i.name === 'setAgentWallet')) process.exit(1);
  if (!rep.find(i => i.name === 'giveFeedback')) process.exit(1);
  if (!rep.find(i => i.name === 'getSummary')) process.exit(1);
"

# ABI tests pass
pnpm test packages/shared/src/abi/index.test.ts --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 6 {exit 0} {exit 1}'
```

---

## Notes for coding agent

- Per ADR-008: use `IAaveOracle.getAssetPrice(asset)` — there is NO direct Chainlink read in this codebase. The Aave Oracle routes to Capped composites internally.
- The Aave V3 ABI can come from `@aave-dao/aave-address-book` (preferred — already installed) or be manually pulled from `aave-v3-origin` source. Either is fine; the test verifies the function set.
- ERC-8004 ABIs MUST be fetched from `https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/master/abis/IdentityRegistry.json` (and `ReputationRegistry.json`). The `fetch-abis.mjs` script commits them to the repo so builds work offline.
- Verified ABI function signatures (from `research/concierge/03-providers/erc8004.md`):
  - `IdentityRegistry.register(string) returns (uint256)`
  - `IdentityRegistry.setAgentWallet(uint256, address, uint256, bytes)` — EIP-712 signature required
  - `ReputationRegistry.giveFeedback(uint256, int128, uint8, string, string, string, string, bytes32)`
- Use `viem`'s `parseAbi(...)` for inline ABI typing (lighter than full JSON) where possible.
- ABI types should be exported as `const` so viem can infer types statically.
