# mPilot Action Providers — Research Summary

Seven deep domain-knowledge files for mPilot's locked action providers on Mantle Mainnet (chain 5000). Each is consumed by `sahil-spec-writer` to produce production-grade specs. All on-chain claims verified via `cast call` against `https://rpc.mantle.xyz` on 2026-06-03. Cross-references to canonical source repos (bgd-labs/aave-address-book, erc-8004/erc-8004-contracts, mantle-lsp/contracts, lifinance/contracts) included where applicable.

## Files (all under `/Users/abu/dev/hackathon/mantel/research/concierge/03-providers/`)

1. **`aave-v3-mantle.md`** (~13.6KB) — Aave V3 lending. Pool `0x458F293454fE0d67EC0655f3672301301DD51422`. All 10 reserves enumerated with aToken + variableDebtToken addresses. E-Mode 1 (sUSDe Stablecoins) LTV 90 / LT 92 / Bonus 4% verified on-chain. Live oracle prices captured (USDC=$0.9996, sUSDe=$1.232).
2. **`mantle-dex.md`** (~12.9KB) — Aggregation across Merchant Moe (Trader Joe v2.2 LB), Agni V3, FusionX V3, WOOFi V2. Li.Fi diamond as meta-fallback. All router/factory addresses verified except Agni QuoterV2 + NPM (flagged UNVERIFIED).
3. **`ethena-susde.md`** (~12.4KB) — sUSDe as LayerZero V2 OFT on Mantle (`0x211Cc4...`). Yield mechanic (basis trade + T-bills + insurance fund) explained. Aave E-Mode 1 collateral. Funding-rate inversion risk and unwind logic specified.
4. **`ondo-usdy.md`** (~10.5KB) — USDY on Mantle confirmed via Li.Fi token list (`0x5bE26527...`). 25.89M total supply. T-bill backed, ~5% APY. **NOT an Aave reserve** — pure spot hold provider (no leverage loop).
5. **`meth-staking.md`** (~10.8KB) — mETH on Mantle (`0xcDA86A...`) as bridge image; canonical Staking on Ethereum L1 (`0xe3cBd06D...`) verified live (exchange rate 1.0929 mETH/ETH, 229,599 ETH staked). mPilot action surface = Mantle-side DEX swap only; L1 staking out of MVP scope. cmETH (restaked) addressed.
6. **`lifi-bridge.md`** (~9.8KB) — LiFi Diamond `0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE` confirmed via Li.Fi `/v1/chains` API. HTTP API integration pattern detailed. Session-key scoping by parsed function selector. Two-stage attestation (sent + completed) for cross-chain.
7. **`erc8004.md`** (~12.3KB) — Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (verified `name()="AgentIdentity"`). Reputation Registry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` (bytecode confirmed). Sepolia counterparts verified. Schema namespace conventions defined for all 6 providers. Self-attestation MVP path; client-attestation deferred.

## UNVERIFIED items requiring human follow-up

| File | Item | Why |
|---|---|---|
| `aave-v3-mantle.md` | `WrappedTokenGatewayV3` address on Mantle | not pulled from address-book in this session; needs `cast call` against bgd-labs |
| `aave-v3-mantle.md` | Mantle Sepolia (5003) deployment | likely Mainnet-only; spec writer must decide mock vs fork |
| `mantle-dex.md` | Agni `QuoterV2` + `NonfungiblePositionManager` addresses | docs not directly fetched; need `cast call` verification |
| `mantle-dex.md` | Mantle Sepolia DEX availability | testnet stack reliability unknown |
| `ethena-susde.md` | Mantle Sepolia sUSDe | likely no Ethena testnet OFT |
| `ondo-usdy.md` | Bridge mechanism (LayerZero OFT vs Wormhole NTT vs custom lock-mint) | needs cast call on USDY's `endpoint()` or source code review |
| `ondo-usdy.md` | rUSDY address (Ethereum) | not directly verified live this session |
| `meth-staking.md` | Mantle Sepolia mETH (METHL2) | docs reference exists; not verified |
| `meth-staking.md` | cmETH ABI for direct deposit | needs source review |
| `lifi-bridge.md` | Mantle Sepolia | testnets typically not supported by Li.Fi production API |
| `erc8004.md` | Validation Registry address on Mantle | out of MVP scope but worth checking deployment registry |
| `erc8004.md` | Reputation Registry full ABI | needs re-fetch from canonical repo; methods inferred but not all live-tested |

## Live oracle / state snapshots (Mantle Mainnet, 2026-06-03 ~11:30 UTC)

- USDC price: `0.99968`
- sUSDe price: `1.23215` (USD)
- mETH/ETH exchange rate (L1): `1.092979776528220398`
- Ethena sUSDe total supply (L1): `1,443,867,670 sUSDe` (~$1.78B)
- Mantle mETH supply (L2): `28,827 mETH`
- Mantle USDY supply (L2): `25,898,474 USDY`
- ETH staked by Mantle LSP: `229,599 ETH`

## Key cross-cutting design notes

- All 7 providers use a uniform `actions / selectors / attestation` API shape, derived from the agentkit-style abstraction.
- Session-key scoping is enumerated per provider (router selectors, Aave methods, ERC-8004 submitFeedback).
- All substantive actions emit ERC-8004 attestations, bundled atomically with the action UserOp where possible.
- Mantle Sepolia is **not** a reliable test target for the protocol-dependent providers (Aave, Ethena, Ondo, Li.Fi). Spec writer should commit to a Mainnet-fork-via-Anvil test harness or accept testing in production with small ($5) real values.

## Files NOT created (intentional)

- No `agent-orchestrator.md`, `intent-router.md`, `tick-loop.md` etc. Out of this task's scope — those belong in the architecture spec (BMad), not in `03-providers/`.
- No Validation Registry deep-dive — flagged for post-MVP.
