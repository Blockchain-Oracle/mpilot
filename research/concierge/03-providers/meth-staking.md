# mETH Staking — Concierge Domain Knowledge

## What this is
mETH is Mantle's native ETH liquid staking token. ETH is staked via Mantle LSP's `Staking` contract on **Ethereum L1** → mETH is minted (non-rebasing, price grows). mETH is then bridged to Mantle Mainnet as the canonical ETH-yield asset of the chain. Concierge uses mETH as the **ETH-denominated yield asset** for users who hold ETH on Mantle and want native staking yield (~3.5% APR) without the L1 friction. Optional path: convert mETH → cmETH (restaked mETH via Karak / EigenLayer) for additional ~1-2% restaking yield.

## Verified facts (with evidence)

### Mantle Mainnet (chain 5000)
| Token | Address | Verification |
|---|---|---|
| mETH (bridged image) | `0xcDA86A272531e8640cD7F1a92c01839911B90bb0` | `symbol()="mETH"`, decimals=18, totalSupply≈28,827 mETH (verified live) |
| cmETH (restaked mETH) | `0xE6829d9a7eE3040e1276Fa75293Bde931859e8fA` | `symbol()="cmETH"`, decimals=18 |
| lvMETH (vault wrapper) | `0x0e927Aa52A38783C1Fd5DfA5c8873cbdBd01D2Ca` | per Li.Fi token list |
| WETH | `0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111` | listed as Aave reserve, symbol="WETH" |

Verification:
```bash
cast call 0xcDA86A272531e8640cD7F1a92c01839911B90bb0 "symbol()(string)" --rpc-url https://rpc.mantle.xyz
# → "mETH"
cast call 0xcDA86A272531e8640cD7F1a92c01839911B90bb0 "totalSupply()(uint256)" --rpc-url https://rpc.mantle.xyz
# → 28827806815382847537473  (~28,827 mETH ≈ $96M at $3,300/ETH)
```

### Ethereum Mainnet (canonical staking)
| Contract | Address | Verification |
|---|---|---|
| Staking (proxy) | `0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f` | `mETHToETH(1e18)` returns `1.092979776528220398e18` (exchange rate ≈ 1.093 ETH per mETH; **mETH is non-rebasing**, price grows) |
| mETH (canonical ERC20) | `0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa` | Mantle LSP docs (offline confirmation; live verification blocked by RPC timeout) |
| `totalControlled()` | – | returns `229,599 ETH` staked under the protocol (verified live) |

Source: https://docs.mantle.xyz/meth + https://github.com/mantle-lsp/contracts

> **Critical**: All ETH staking happens on **L1**. The Mantle mETH is a **bridged image**. To mint fresh mETH from ETH on Mantle, you must (a) bridge ETH to Ethereum, (b) call `Staking.stake()` on L1, (c) bridge mETH back. This is **slow and expensive** for small amounts. The practical path: **DEX-swap WETH (on Mantle) ↔ mETH (on Mantle)** via Agni/FusionX/Merchant Moe.

### Mantle Sepolia (5003)
**[UNVERIFIED]**: a Mantle LSP testnet exists (METHL2 contract). Concierge spec should either mock or skip Sepolia for this provider.

### Source code repo
- mETH protocol contracts: https://github.com/mantle-lsp/contracts
- Audits: Halborn, ChainSecurity, OpenZeppelin (per Mantle LSP docs)

## Key functions / ABI surface

### On Ethereum L1 (Staking contract — only relevant for large/whitelisted flows)
```solidity
// Stake ETH → receive mETH. minMETHAmount = slippage protection (mETH price could move).
function stake(uint256 minMETHAmount) external payable;

// Request unstake — burns mETH, returns NFT receipt. Cooldown ~7 days.
function unstakeRequest(uint128 methAmount, uint128 minETHAmount) external returns (uint256 requestID);

// Claim ETH after cooldown.
function claimUnstakeRequest(uint256 requestID) external;

// Conversion helpers — live oracle for exchange rate.
function mETHToETH(uint256 mETHAmount) external view returns (uint256 ETHAmount);
function ethToMETH(uint256 ethAmount) external view returns (uint256 mETHAmount);

// Protocol stats
function totalControlled() external view returns (uint256);   // total ETH under management
function exchangeRate() external view returns (uint256);       // mETH/ETH * 1e18

// Read-only — am I unstake-ready?
function unstakeRequestInfo(uint256 requestID) external view returns (
    bool isFinalized,
    uint256 claimableAmount
);
```

### On Mantle (mETH as ERC20)
Concierge does NOT mint/burn mETH on Mantle — it only holds it and trades it. Surface:
```solidity
function balanceOf(address) returns (uint256);
function approve(address spender, uint256) returns (bool);
function transfer(address to, uint256) returns (bool);
// LayerZero/L2 bridge specifics ([UNVERIFIED] — need to confirm OFT vs custom bridge):
function send(...) external payable;
```

### Gotchas
- `unstakeRequest` on L1 returns an NFT-style request — track the `requestID`. Concierge does not handle L1 directly (out of scope), but the docs spec mentions it for completeness.
- `mETHToETH` is a **price oracle**: 1 mETH ≈ 1.0929 ETH today (verified). This number grows every block from staking rewards. Concierge reads it via a cross-chain oracle (Redstone/Chainlink on Mantle) — **not direct L1 call**.
- `cmETH` is a separate restaked wrapper (Karak/EigenLayer-style); 1 cmETH ≈ 1 mETH at mint; price grows from restaking rewards on top of mETH's price growth.
- Bridge in/out has LayerZero gas costs — Concierge avoids it for amounts < ~1 ETH.

## Integration pattern for Concierge

### Package: `@concierge-mantle/meth-staking`
Action provider scope = **Mantle-side only** (Ethereum L1 path is out of MVP scope; recommend cross-chain via Li.Fi for users who want to mint fresh):
- `actions.acquire({amountWETH, slippageBps})` — DEX-swap WETH → mETH on Mantle.
- `actions.divest({amountMETH, slippageBps})` — DEX-swap mETH → WETH on Mantle.
- `actions.restake({amountMETH})` — wrap mETH → cmETH (when cmETH protocol supports direct deposit) [UNVERIFIED — needs cmETH ABI].
- `actions.unrestake({amountCMETH})` — unwrap cmETH → mETH.
- `selectors.priceETH()` — reads mETHToETH from a Mantle oracle source.
- `selectors.estimatedAPY()` — fetches from Mantle LSP public API.

### Plan → Simulate → Propose → Execute
1. **Plan**: tick determines target ETH-staking-yield exposure. If user holds WETH, plan a swap-to-mETH (small amounts) or a cross-chain bridge-stake-bridge (large amounts via Li.Fi).
2. **Simulate**: quote via mantle-dex provider for the WETH↔mETH pool (Agni or FusionX). Verify `minOut`.
3. **Propose**: build UserOp = `approve(WETH, router) + swap(router, WETH, mETH)`. Session-key scoped.
4. **Execute**: send. Read `Transfer` for mETH received.

### ERC-8004 attestation
```json
{
  "schema": "concierge.mantle.meth.acquire.v1",
  "chain": 5000,
  "amountWETHIn": "1000000000000000000",
  "amountMETHOut": "914237498261834678",
  "exchangeRateAtTick": "1093821840000000000",
  "txHash": "0x...",
  "ts": 1717400000
}
```

### Error handling
| Failure | Concierge action |
|---|---|
| DEX route fails (no WETH/mETH pool) | Try WETH→USDC→mETH 2-hop |
| Live exchange rate diverges >2% from oracle | Pause acquire (possible attack / stale oracle) |
| cmETH deposit reverts (capped) | Skip restake; surface user warning |
| User holds < 0.01 mETH | Skip; gas dominates |
| Mantle bridge halt | DEX-only swap remains; bridge actions blocked |

## Mechanics / mental model

### How mETH yield accrues
1. User stakes ETH at `Staking.stake()` on L1 → mETH minted at current exchange rate.
2. Mantle LSP runs an Ethereum L1 validator fleet (delegated to professional node operators).
3. ETH staking rewards (~3-4% APR after MEV/commission) accumulate to the protocol's vault.
4. `exchangeRate()` grows: 1 mETH redeems for slightly more ETH each block.
5. mETH on L2 (Mantle) reads this exchange rate via a Redstone/Chainlink feed.

### Non-rebasing model
mETH balance is constant; ETH-denominated value rises. Differs from Lido's stETH (rebases). Concierge HF calculations using mETH as collateral (if Aave ever lists it — currently not listed) would use the oracle's USD price (= mETH/ETH × ETH/USD).

### cmETH and the restaking stack
- cmETH is mETH **restaked** into Karak / EigenLayer-style actively validated services. Adds ~1-2% APR on top.
- Slashing risk: restaking ANY position adds operational risk. cmETH is **not riskless**.
- Concierge default: do **not** auto-restake. Require user opt-in via explicit "enable cmETH" flag.

### Why mETH at all for Concierge?
- Mantle ecosystem alignment: building on Mantle, holding Mantle's LST = signal.
- ETH-denominated yield for users who don't want stablecoin exposure.
- Future Aave V3 Mantle listing — wrsETH is already listed (`0x93e855643e940D025bE2e529272e4Dbd15a2Cf74`); mETH likely follows. When it does, mETH-collateral leverage loops become viable.

## Risks + edge cases

1. **DEX-pool depth**: WETH/mETH pool on Mantle is thin (~few hundred ETH). Concierge max single trade = $10K equivalent. Above that, the cross-chain L1-stake path is the only safe option.
2. **Exchange-rate oracle lag**: Mantle's mETH/ETH oracle may lag L1 by minutes-hours. Concierge treats spot DEX price vs oracle delta > 100bp as "abnormal" and pauses.
3. **Slashing**: Mantle LSP validators slashing event → mETH oracle drops → DEX panic. Concierge auto-divest trigger: mETH/ETH oracle drops >3% in 1h.
4. **cmETH restaking slashing**: layered risk — if any restaking operator misbehaves, cmETH price drops independently of mETH.
5. **Cross-chain bridge halt**: rare but possible. mETH continues earning on L1; users can't easily move between chains.
6. **Aave listing gap**: currently no Aave V3 Mantle market for mETH (only wrsETH). Concierge has no leverage loop here — it's hold-only. If Aave adds mETH (E-Mode "ETH correlated" category), Concierge can copy the sUSDe wedge pattern.

## Reference URLs
- Mantle LSP docs: https://docs.mantle.xyz/meth/introduction/overview
- mETH protocol app: https://www.methprotocol.xyz
- mETH GitHub: https://github.com/mantle-lsp/contracts
- mETH on Mantle explorer: https://mantlescan.xyz/address/0xcDA86A272531e8640cD7F1a92c01839911B90bb0
- Staking on Etherscan: https://etherscan.io/address/0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f
- cmETH info: https://www.cmeth.xyz (Karak-restaking)
- Live APY (public): https://www.methprotocol.xyz/api (verify endpoint)

## Open questions for spec writer
1. **L1 staking path**: include in MVP or defer? Recommend defer — cross-chain UX is heavy for hackathon scope.
2. **cmETH auto-restake**: opt-in or opt-out? Recommend opt-in for safety.
3. **Pool depth check**: max swap as % of pool? Recommend 1% (matches sUSDe rule).
4. **Concierge wedge fit**: the locked wedge is stablecoin-denominated (sUSDe→USDC leverage). mETH is ETH-denominated and currently has no Aave market. Is mETH provider in MVP, or post-MVP? Recommend: ship as "hold-and-display" only in MVP. No leverage path until Aave lists.
5. **Exchange rate source**: use which on-chain Mantle oracle? (Redstone vs Chainlink — confirm).
6. **Divestment trigger**: same as sUSDe (3% drop in oracle price in 1h)? Or different given lower yield/lower volatility?
