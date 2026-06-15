# Ondo USDY — Concierge Domain Knowledge

## What this is
USDY (US Dollar Yield Token) is Ondo Finance's tokenized exposure to **short-duration US Treasuries + bank deposits**. It is yield-bearing (T-bill rate ~5%), non-USD-redeemable for retail (only mintable/burnable by KYC'd entities via Ondo), but freely transferable on-chain after a 40-day cliff. Concierge uses USDY as the **lowest-risk yield-bearing collateral** alternative to sUSDe for users who want T-bill-only exposure.

> **Important**: USDY is **NOT currently a borrowable/collateral asset on Aave V3 Mantle** (not in the `getReservesList()` output). It IS deployed on Mantle as an ERC20 (verified below), tradeable on DEXes. Concierge action provider scope is therefore: (a) acquire USDY via DEX, (b) hold for yield (no Aave loop), (c) divest to USDC. Future scope: build a custom CDP if Aave lists it.

## Verified facts (with evidence)

### Mantle Mainnet (chain 5000)
| Token | Address | Verification |
|---|---|---|
| USDY (Ondo U.S. Dollar Yield) | `0x5bE26527e817998A7206475496fDE1E68957c5A6` | `symbol()="USDY"`, `name()="Ondo U.S. Dollar Yield"`, `decimals()=18`, `totalSupply()=25,898,474 USDY` (~$26M circulating on Mantle) |

Verification:
```bash
cast call 0x5bE26527e817998A7206475496fDE1E68957c5A6 "symbol()(string)" --rpc-url https://rpc.mantle.xyz
# → "USDY"
cast call 0x5bE26527e817998A7206475496fDE1E68957c5A6 "name()(string)" --rpc-url https://rpc.mantle.xyz
# → "Ondo U.S. Dollar Yield"
cast call 0x5bE26527e817998A7206475496fDE1E68957c5A6 "totalSupply()(uint256)" --rpc-url https://rpc.mantle.xyz
# → 25898474899153190439803001  (25.89M USDY)
```

Source: Li.Fi token list for chain 5000 (`https://li.quest/v1/tokens?chains=5000`) lists USDY at this address.

### Ethereum Mainnet (canonical mint chain)
| Token | Address | Notes |
|---|---|---|
| USDY (ERC20) | `0x96F6eF951840721AdBF46Ac996b59E0235CB985C` | symbol="USDY", decimals=18, verified live |
| rUSDY (rebasing wrapper) | `0xaB60aD1a07Bf3d9C97c5b62b1Eb4d8a9C0cdf48a` | rebases to $1; some Aave/Morpho markets use this | [UNVERIFIED — needs cast call from human] |

The Mantle USDY is a bridge-image (not a fresh mint). Ondo controls the bridge — typically Wormhole or LayerZero. **[UNVERIFIED — needs human to confirm the bridge mechanism]**: based on Mantle's ecosystem, likely Wormhole NTT or LayerZero OFT.

### Mantle Sepolia (5003)
**[UNVERIFIED]**: no Ondo testnet deployment confirmed. Concierge spec uses a stub on Sepolia.

### Source repo
- Ondo contracts (public portion): https://github.com/ondoprotocol — note Ondo's USDY core mint contracts are NOT fully open-source; only auxiliary contracts (rebasing wrapper, oracles) are public.
- Audits: Code4rena (rUSDY), Trail of Bits (USDY core).

## Key functions / ABI surface

### On Mantle (USDY as ERC20)
USDY on Mantle behaves like a standard ERC20 — Concierge interacts only with the ERC20 surface:
```solidity
function balanceOf(address) returns (uint256);
function transfer(address to, uint256 amount) returns (bool);
function approve(address spender, uint256 amount) returns (bool);
function totalSupply() returns (uint256);

// Possibly OFT extras if it's LayerZero-bridged:
function send(SendParam, MessagingFee, address) external payable;
function quoteSend(SendParam, bool) external view returns (MessagingFee);
```
**[UNVERIFIED — needs cast call from human]**: confirm OFT vs NTT vs lock-mint bridge by calling `endpoint()` or checking source.

### Yield mechanic (off-chain)
USDY accrues yield off-chain. The on-chain `balanceOf` does NOT rebase. Instead:
- Each USDY token represents a fractional claim on T-bill yield.
- Off-chain Ondo publishes the **effective USD price** (e.g. 1 USDY = $1.067 at time of writing) that grows ~5% APR.
- For transactable display in Concierge UI: pull live price from Ondo's published feed OR from a DEX TWAP (USDY/USDC pool on Agni or Merchant Moe).

### Transfer restrictions
Per Ondo's docs:
- USDY has a **40-day transfer cliff after mint** (regulatory). Once bridged image is in circulation, this cliff is satisfied — Concierge sees no restriction in normal flow.
- Holders in restricted jurisdictions (US persons without accreditation, OFAC) cannot hold. **Concierge does not mint USDY** — it acquires via DEX, so this restriction doesn't bite directly. But: if Ondo ever blacklists an address, the USDY in that address becomes frozen. Spec must surface this risk to users.

## Integration pattern for Concierge

### Package: `@mpilot/ondo-usdy`
Exports:
- `actions.acquire({amountUSDC, slippageBps})` — DEX-swap USDC → USDY via mantle-dex provider.
- `actions.divest({usdyAmount, slippageBps})` — DEX-swap USDY → USDC.
- `selectors.priceUSD()` — fetches from (a) Ondo's published API `https://api.ondo.finance/usdy/price` OR (b) DEX TWAP fallback.
- `selectors.estimatedAPY()` — fetches from Ondo's API (currently ~5.05% per published rate).
- `selectors.poolDepth({venue})` — DEX-pool liquidity check.

> No Aave loop, no native staking. Pure spot acquisition + hold. The provider is intentionally minimal.

### Plan → Simulate → Propose → Execute
1. **Plan**: tick determines target USDY allocation (e.g. "user wants 30% T-bill exposure").
2. **Simulate**: quote via mantle-dex provider. **Sanity-check**: ensure quoted price is within 1% of Ondo's published price (catches DEX-pool-skew attacks).
3. **Propose**: UserOp = `approve(USDC, router) + swap(router, USDC, USDY)`. Session key scoped to USDC.approve + router selector.
4. **Execute**: send. Read `Transfer` for USDY received.

### ERC-8004 attestation
```json
{
  "schema": "concierge.ondo.usdy.acquire.v1",
  "chain": 5000,
  "venue": "agni",
  "amountUSDCIn": "1000000000",
  "amountUSDYOut": "934567890123456789000",
  "priceUSD": "106700000",
  "ondoPublishedPriceUSD": "106712000",
  "deviationBps": 11,
  "txHash": "0x...",
  "ts": 1717400000
}
```
The `deviationBps` field proves Concierge swapped at fair value vs Ondo's published price — a key reputation signal.

### Error handling
| Failure | Concierge action |
|---|---|
| DEX route fails (USDY pool too shallow) | Fall back to Li.Fi; if it also fails, abort tick |
| DEX quote deviates >100bp from Ondo price | Refuse swap; alert user (pool may be illiquid) |
| Ondo API down | Use DEX TWAP only; degrade APY display |
| USDY blacklist on user's address (`OFAC_FROZEN` event) | Pause provider for user; surface error message |
| Bridge halt (LZ/Wormhole pause) | DEX-swap still works; bridge actions blocked |

## Mechanics / mental model

### Yield source
- Backed 1:1 by short-duration US Treasuries (held at BNY Mellon as bankruptcy-remote SPV per Ondo's disclosure) plus a small bank deposit buffer for liquidity.
- T-bills accrue interest; yield passed through to token price (5.05% APY as of latest Ondo disclosure).
- Monthly reserve attestations published by Ankura Trust.

### Non-rebasing vs rebasing
- **USDY (non-rebasing)**: balance stays constant, price grows. Default. What's on Mantle.
- **rUSDY (rebasing)**: balance grows daily to track yield. Stays at $1 nominal. Lives on Ethereum, Polygon, Solana. **Not on Mantle.**

### Comparison to sUSDe
| Dimension | USDY (T-bill) | sUSDe (Ethena) |
|---|---|---|
| Yield source | T-bills (5%) | Funding rate (6-25%) |
| Risk | Sovereign + bank custody | CEX + custodial + perp basis |
| Reg framework | RegS / RegD exemption | None (synthetic stable) |
| Mantle Aave collateral | No | Yes (E-Mode 1, LT 92%) |
| Best for | Risk-averse hold | Yield maximizer |
| Concierge wedge fit | Pure hold (no leverage) | Leverage (borrow against) |

### Why hold USDY in Concierge at all?
The locked wedge centers on sUSDe leverage. USDY exists as a **diversifier**: for users who want partial T-bill backing (lower variance, lower yield), Concierge holds a mix like 60% sUSDe loop / 40% USDY hold. The USDY portion isn't levered — it's pure yield + dollar-stable behavior.

## Risks + edge cases

1. **DEX-pool depth on Mantle**: with only $26M USDY in circulation on Mantle, pool depth is shallow. Concierge max single trade = $50K (configurable). Above that, bridge to Ethereum is required.
2. **Bridge halt**: cross-chain USDY supply is bridge-image. If the bridge pauses, USDY on Mantle becomes "stranded" — still earns yield (price keeps growing) but can't be redeemed to USD without bridging back.
3. **Regulatory blacklist**: Ondo can blacklist addresses (under US sanctions). Probability low for end-user wallets but non-zero. Spec: warn user that custodial freeze risk applies.
4. **Price feed staleness**: no Chainlink feed for USDY on Mantle (likely). Concierge falls back to DEX TWAP — vulnerable to short-term manipulation. Mitigate with 30-min TWAP, not spot price.
5. **Off-chain yield publication lag**: Ondo publishes price daily, not block-by-block. APY display in Concierge may lag actual accrual by 1 day. Acceptable for the UX.
6. **No Aave path**: future risk — if Aave lists USDY (likely given Mantle's push), Concierge will need a follow-up provider. Plan ahead by keeping the action provider interface uniform with `@mpilot/ethena-susde`.

## Reference URLs
- Ondo Finance docs: https://docs.ondo.finance
- USDY product page: https://ondo.finance/usdy
- USDY on Mantle explorer: https://mantlescan.xyz/address/0x5bE26527e817998A7206475496fDE1E68957c5A6
- USDY on Etherscan (canonical): https://etherscan.io/address/0x96F6eF951840721AdBF46Ac996b59E0235CB985C
- Reserve attestation: https://ondo.finance/reserves
- GitHub (partial): https://github.com/ondoprotocol

## Open questions for spec writer
1. **Bridge mechanism**: confirm LayerZero OFT vs Wormhole NTT vs lock-mint custom. Spec must include the bridge contract address if Concierge ever calls `send()`.
2. **Price feed source**: prefer Ondo API or DEX TWAP? Recommend: DEX TWAP for on-tick decisions (no API dependency), Ondo API for UI display.
3. **Min trade size**: $1? $10? Recommend $50 floor (gas + slippage dominates below this).
4. **Allocation policy**: define the default sUSDe/USDY split (suggest configurable, default 70/30).
5. **Bridge fallback**: if Mantle DEX depth insufficient, should Concierge auto-bridge to Ethereum, swap, and bridge back? Adds complexity + latency. Recommend: NO — surface to user, let them pick.
6. **Aave listing watcher**: schedule a weekly tick that polls `getReservesList()` for new USDY listing. If detected, alert dev team to enable the leverage path.
