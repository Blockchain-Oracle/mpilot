# Ethena sUSDe — Concierge Domain Knowledge

## What this is
sUSDe is Ethena's yield-bearing wrapper around USDe (Ethena's synthetic dollar). It accrues yield from (a) ETH/BTC perp funding rates Ethena captures, (b) basis trade returns, (c) reserve T-bill yield. Concierge uses sUSDe as the **primary yield-bearing collateral** for the locked Hold/YieldBNPL wedge — deposit user's stablecoin → swap to sUSDe → supply to Aave E-Mode 1 → borrow spendable USDC at LTV 90%, where sUSDe APY > USDC borrow APR (positive carry).

## Verified facts (with evidence)

### Mantle Mainnet (chain 5000)
| Token | Address | Notes |
|---|---|---|
| sUSDe (LayerZero V2 OFT) | `0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2` | symbol="sUSDe", decimals=18 |
| USDe (LayerZero V2 OFT) | `0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34` | symbol="USDe", decimals=18 |
| LayerZero V2 Endpoint | `0x1a44076050125825900e736c501f859c50fE728c` | canonical LZ V2 EndpointV2 |

Verification:
```bash
cast call 0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2 "symbol()(string)" --rpc-url https://rpc.mantle.xyz
# → "sUSDe"
cast call 0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2 "endpoint()(address)" --rpc-url https://rpc.mantle.xyz
# → 0x1a44076050125825900e736c501f859c50fE728c (LayerZero V2 EndpointV2)
cast call 0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2 "owner()(address)" --rpc-url https://rpc.mantle.xyz
# → 0x799a2Cd46CBc7FB53949072257e6331054A060Bb (Ethena Mantle ops multisig)
```

Live Aave oracle price for sUSDe on Mantle = `123214617` (USD * 1e8 = $1.232) — confirming non-rebasing share price growth.

### Mantle Sepolia (chain 5003)
**[UNVERIFIED — likely no Ethena testnet deployment]**: Ethena does not maintain a Mantle Sepolia OFT. Concierge spec must either mock sUSDe on testnet or use a Mainnet fork.

### Ethereum Mainnet (canonical staking)
| Token | Address | Verification |
|---|---|---|
| USDe (ERC20) | `0x4c9EDD5852cd905f086C759E8383e09bff1E68B3` | per Ethena docs |
| StakedUSDeV2 (sUSDe vault) | `0x9D39A5DE30e57443BfF2A8307A4256c8797A3497` | `cast call → symbol()="sUSDe"`; totalSupply = 1.44B (verified live) |

> **Critical:** Mantle sUSDe is **not** the staking vault — it is a **LayerZero OFT bridged image** of the Ethereum sUSDe. The price (`assetsPerShare`) follows the Ethereum vault via the bridge; you cannot "stake on Mantle". To mint fresh sUSDe, USDe must be bridged to Ethereum, staked, and bridged back.

### Source code repos
- Ethena contracts: https://github.com/ethena-labs/ethena
- LayerZero V2 OFT spec: https://github.com/LayerZero-Labs/devtools (oapp pattern)

## Key functions / ABI surface

### On Mantle (sUSDe as LayerZero OFT)
sUSDe on Mantle is a standard ERC20 + LayerZero OFT — Concierge interacts with it as an ERC20 for Aave deposits.

```solidity
// Standard ERC20 — used for Aave supply/withdraw flow
function balanceOf(address) returns (uint256);
function approve(address spender, uint256 value) returns (bool);
function transfer(address to, uint256 amount) returns (bool);
function totalSupply() returns (uint256);

// OFT — for bridging back to Ethereum (NOT used for yield, only for redemption)
function send(
    SendParam calldata _sendParam,    // {dstEid, to, amountLD, minAmountLD, extraOptions, composeMsg, oftCmd}
    MessagingFee calldata _fee,        // {nativeFee, lzTokenFee}
    address _refundAddress
) external payable returns (MessagingReceipt memory, OFTReceipt memory);

// Preview fee
function quoteSend(SendParam calldata _sendParam, bool _payInLzToken)
    external view returns (MessagingFee memory);
```

### On Ethereum (canonical sUSDe vault — ERC-4626)
```solidity
// Standard 4626 — deposit USDe, get sUSDe
function deposit(uint256 assets, address receiver) returns (uint256 shares);
function mint(uint256 shares, address receiver) returns (uint256 assets);

// Withdraw — subject to 7-day cooldown if cooldownDuration > 0
function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares);
function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets);

// Conversion helpers — live exchange rate
function convertToAssets(uint256 shares) returns (uint256 assets);
function convertToShares(uint256 assets) returns (uint256 shares);
function totalAssets() returns (uint256);    // total USDe backing all sUSDe

// Cooldown (StakedUSDeV2 only)
function cooldownDuration() returns (uint24);            // currently 7 days
function cooldownShares(uint256 shares) returns (uint256 assets);  // start cooldown
function cooldownAssets(uint256 assets) returns (uint256 shares);
function unstake(address receiver);                       // claim after cooldown
function silo() returns (address);                         // silo holding the cooldown USDe
```

### Gotchas
- **Mantle sUSDe is non-rebasing**: its USD price grows (`convertToAssets` doesn't exist on the OFT — Concierge reads the **Aave oracle's reported price** as the authoritative USD value for HF calculations).
- **Bridge fees**: `quoteSend` returns LZ native gas fee — Concierge must include this in any "redeem to USDe" flow.
- **7-day cooldown on Ethereum**: redemption is asynchronous. Concierge does NOT trigger this on tick — it just holds sUSDe and unwinds via DEX swap when needed.
- **OFT decimals shared**: USDe and sUSDe are both 18 decimals on Mantle. Don't auto-convert with the 6-decimal stables.
- **Owner can pause OFT.send**: Ethena ops can disable bridging in an emergency. Mantle sUSDe still circulates as ERC20 (and earns yield), but cannot be redeemed to Ethereum during a pause. Concierge falls back to DEX swap (Li.Fi → Agni/Curve-on-Eth) for exit liquidity.

## Integration pattern for Concierge

### Package: `@concierge-mantle/ethena-susde`
Exports:
- `actions.acquire({amountUSDC, slippageBps})` — DEX-swaps USDC → sUSDe via the mantle-dex provider (NOT a direct stake; sUSDe is bridged from Eth, not minted on Mantle).
- `actions.divest({sharesAmount, slippageBps})` — DEX-swaps sUSDe → USDC.
- `actions.bridgeBack({amount, dstEid: 30101})` — OFT send back to Ethereum (rarely called; only on full exit + cooldown).
- `selectors.priceUSD()` — reads Aave oracle (`0x47a063CfDa980532267970d478EC340C0F80E8df.getAssetPrice(sUSDe)`); returns USD 1e8.
- `selectors.estimatedAPY()` — fetched from Ethena public API `https://api.ethena.fi/yields/protocol-and-staking-yield`.

### Plan → Simulate → Propose → Execute (acquire flow)
1. **Plan**: tick determines target sUSDe weight (e.g. 80% of stables in sUSDe). Compute delta in USDC terms.
2. **Simulate**: quote via mantle-dex provider (Li.Fi or Agni 5bp stable pool). Verify `minOut` post-slippage.
3. **Propose**: build UserOp = `approve(USDC, router, amt) + swap(router, USDC, sUSDe, amt, minOut)`. Session key scoped to USDC.approve + chosen router selector.
4. **Execute**: send via 4337 bundler. Read `Transfer` event for sUSDe received.

### ERC-8004 attestation
```json
{
  "schema": "concierge.ethena.susde.acquire.v1",
  "chain": 5000,
  "venue": "agni",
  "amountUSDCIn": "1000000000",
  "amountSUSDeOut": "812345678901234567000",
  "priceUSD": "123214617",
  "txHash": "0x...",
  "ts": 1717400000
}
```

### Error handling
| Failure | Concierge action |
|---|---|
| DEX route fails (shallow pool) | Fall back to Li.Fi; if Li.Fi fails too, abort tick and surface to user |
| Aave oracle stale (no price) | Pause acquire/divest until oracle resumes |
| OFT.send paused | Block any bridge action; DEX swap-out remains available |
| sUSDe USD price < $1 (depeg signal) | Pause acquire; auto-trigger divest tick if HF threatened |
| User holds < $1 in sUSDe and wants to divest | Skip — gas dominates |

## Mechanics / mental model

### How Ethena generates yield
1. **Delta-neutral basis trade**: for every $1 USDe minted, Ethena longs $1 spot ETH/BTC/SOL/etc. on a custodian (Copper/Fireblocks/Ceffu) and shorts $1 of perp futures on a CEX (Binance/Bybit/OKX/Deribit). Net delta = 0. Yield = funding rate paid by perp longs to shorts (historically averaging 8-25% APR).
2. **T-bill reserve**: ~20-30% of backing is in BlackRock BUIDL / USDC parked at custodians earning ~5%.
3. **Insurance fund**: 20% of yield goes to a buffer that covers negative-funding periods.

> sUSDe APY is published live at https://app.ethena.fi (typically 6-15% historically, can spike with funding).

### Non-rebasing share price model
Unlike Lido stETH, sUSDe is **non-rebasing** — your balance stays constant; the USD redemption value rises. `sUSDe USD price = totalAssets / totalSupply`. On Aave Mantle, the oracle reports this as `1.232 * 1e8` (live).

This matters because:
- aToken supply is share-based: 1 sUSDe → 1 aSUSDe; USD value updates via oracle.
- HF calculations in Aave already use the USD-priced collateral, so Concierge doesn't double-count.

### Bridge image vs canonical
The Mantle sUSDe is a **fungible image** locked-and-minted via LayerZero V2. When Ethereum sUSDe's exchange rate ticks up, the Mantle oracle (Redstone/Chainlink) reports the new price. The image itself isn't a stake position — it's a delegated claim that can be bridged back. Implications for Concierge:
- Yield "happens" on Ethereum; Mantle holders capture it via the oracle price feed.
- Exit liquidity on Mantle = DEX pool depth (Agni stable pool, Merchant Moe LB, WOOFi). Concierge should monitor depth before sizing positions > $10K.

### Funding rate risk
When perp funding goes negative (bear → shorts pay longs), Ethena's yield turns negative; sUSDe yield drops to ~T-bill rate (5%) buffered by insurance fund. Mantle USDC borrow APR on Aave fluctuates 3-15%. **The Concierge wedge only works while sUSDe APY > USDC borrow APR + slippage + gas.** Tick logic must check this **every tick** and auto-deleverage if the spread inverts.

## Risks + edge cases

1. **sUSDe depeg**: If Ethena's delta-neutral position breaks (CEX failure, custodian seizure, large liquidation event), sUSDe price can drop sharply. Concierge's auto-deleverage trigger: oracle price drops >2% in 10 min or stays below recent 24h MA by >1%.
2. **Aave Mantle E-Mode 1 liquidation cascade**: if sUSDe price drops 8% with HF=1.6, HF approaches 1.0. Concierge's HF floor (1.25) gives ~4% buffer before liquidation. Real cushion is thinner than it looks.
3. **LayerZero bridge halt**: LZ has a security council that can pause OFTs. Concierge spec must include a "DEX-only mode" fallback if `OFT.send` reverts.
4. **Funding rate inversion (carry trade fails)**: see above. Spec must define when to unwind: 3-tick rolling check of `sUSDeAPY - USDCBorrowAPR < 100bp` → start unwind plan.
5. **Aave oracle drift vs Ethena canonical price**: Mantle oracle updates may lag the Ethereum vault by minutes. Concierge treats Aave oracle as authoritative for HF; uses Ethena API for APY display only.
6. **Slippage on exit**: Mantle sUSDe-USDC pool depth ≈ $5M (rough; needs monitoring). Concierge's max single divest = 1% of pool depth → $50K.

## Reference URLs
- Ethena docs: https://docs.ethena.fi
- Ethena GitHub: https://github.com/ethena-labs/ethena
- StakedUSDeV2 (canonical, Eth): https://etherscan.io/address/0x9D39A5DE30e57443BfF2A8307A4256c8797A3497
- sUSDe on Mantle explorer: https://mantlescan.xyz/address/0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2
- LayerZero V2 OFT spec: https://docs.layerzero.network/v2/developers/evm/oft/quickstart
- Live yields API: https://api.ethena.fi/yields/protocol-and-staking-yield

## Open questions for spec writer
1. **Acquisition source**: DEX-swap-on-Mantle (fast, slippage cost) vs bridge-from-Ethereum (slow, gas cost, no slippage)? Recommend: DEX-on-Mantle for < $10K, bridge for >$10K.
2. **APY data source**: Ethena public API (off-chain) vs derived from Aave oracle delta? Recommend off-chain API for display, on-chain oracle for HF.
3. **Carry-trade unwind threshold**: spec the exact rule (e.g. "if sUSDeAPY - USDCBorrowAPR < 200bp for 3 consecutive ticks, unwind 50%").
4. **Bridge gas budget**: define max acceptable LZ fee for `bridgeBack` (suggestion: cap at $5 — anything more, DEX-swap to USDC and Li.Fi-bridge instead).
5. **Pool depth monitor**: define which provider tracks DEX liquidity depth and how often (recommend: piggyback on swap quotes from mantle-dex provider).
6. **APY snapshot in attestation**: include APY at tick time so reputation can prove the wedge was profitable when planned.
