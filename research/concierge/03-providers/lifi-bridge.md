# `@concierge/lifi-bridge` — Domain Knowledge

## What this is

Li.Fi is a cross-chain aggregator that routes bridges + swaps across 30+ chains via a single API. Concierge uses Li.Fi for two flows: (1) bridging assets INTO Mantle so a user with funds on Ethereum/Base/Arbitrum/Polygon can fund their agent without manual bridging; (2) bridging OUT for redemption flows (e.g., bridge USDe to Ethereum for native sUSDe minting). Li.Fi handles route selection, fee estimation, slippage controls, and bridge-vs-DEX-swap composition under the hood.

## Verified facts

**Mantle support confirmed:** `curl https://li.quest/v1/chains | jq '.chains[] | select(.id == 5000)'` returns:
```json
{ "id": 5000, "name": "Mantle", "key": "mnt", "mainnet": true, ... }
```

**Source of truth:**
- API base URL: `https://li.quest/v1`
- Docs: https://docs.li.fi/
- TypeScript SDK: `@lifi/sdk` on npm
- React widget: `@lifi/widget` on npm

**Authentication:** Public API, no key required for basic quoting. Production-grade rate limits require an API key from Li.Fi (free tier 60 req/min).

**Li.Fi Diamond contract on Mantle Mainnet (verified via `/v1/chains` API):** `0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE` — this is the on-chain entrypoint Concierge's `bridgeIn`/`bridgeOut` actions ultimately call (returned in `quote.transactionRequest.to`). Same Diamond address across most chains Li.Fi supports — single canonical deployment per chain.

## Key endpoints / actions

### Get supported chains
```http
GET https://li.quest/v1/chains
→ Array of { id, name, key, mainnet, nativeToken, multicallAddress, ... }
```

### Get supported tokens per chain
```http
GET https://li.quest/v1/tokens?chains=5000
→ { tokens: { "5000": [ { address, symbol, decimals, name, chainId, ... } ] } }
```

### Get bridge route quote
```http
GET https://li.quest/v1/quote
  ?fromChain=1                        # Ethereum
  &toChain=5000                       # Mantle
  &fromToken=0xA0b8...eB48           # USDC on Ethereum
  &toToken=0x09Bc...0dF9             # USDC on Mantle
  &fromAmount=100000000               # 100 USDC (6 decimals)
  &fromAddress=0x...                  # sender wallet
  &toAddress=0x...                    # receiver wallet (typically same)
  &slippage=0.005                     # 0.5%
  &integrator=concierge               # for analytics
→ {
    id, type, tool, toolDetails,         // bridge being used (e.g., Stargate, Across)
    fromChainId, toChainId,
    estimate: { fromAmount, toAmount, toAmountMin, executionDuration, gasCosts: [...] },
    transactionRequest: { to, data, value, gasLimit, gasPrice, chainId }, // ready to sign + send
    includedSteps: [...]                 // bridge + swap sub-steps
  }
```

### Check transaction status
```http
GET https://li.quest/v1/status?txHash=0x...
→ { status: 'PENDING' | 'DONE' | 'FAILED', fromTx, toTx, ... }
```

### Multi-chain swap (no bridge) on same chain
```http
GET https://li.quest/v1/quote?fromChain=5000&toChain=5000&fromToken=...&toToken=...&fromAmount=...
→ Same shape, but `tool` is a DEX (e.g., "merchantmoe", "agni") and bridge sub-steps are empty
```

## Integration pattern for Concierge

```typescript
// packages/concierge/lifi-bridge/src/provider.ts
import { z } from 'zod';

const LIFI_API = 'https://li.quest/v1';
const MANTLE_CHAIN_ID = 5000;

export function createLifiBridgeProvider(opts: { apiKey?: string; integrator?: string }) {
  const headers = opts.apiKey ? { 'x-lifi-api-key': opts.apiKey } : {};

  return {
    // Action: bridge an asset INTO Mantle
    bridgeIn: {
      description: 'Bridge an ERC-20 asset from another chain to Mantle Mainnet',
      inputSchema: z.object({
        fromChain: z.number().int().positive(),
        fromToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        toToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),       // on Mantle
        fromAmount: z.string(), // wei string
        fromAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        slippage: z.number().min(0).max(0.05).default(0.005),
      }),
      execute: async (input, ctx) => {
        const url = new URL(`${LIFI_API}/quote`);
        url.searchParams.set('fromChain', String(input.fromChain));
        url.searchParams.set('toChain', String(MANTLE_CHAIN_ID));
        url.searchParams.set('fromToken', input.fromToken);
        url.searchParams.set('toToken', input.toToken);
        url.searchParams.set('fromAmount', input.fromAmount);
        url.searchParams.set('fromAddress', input.fromAddress);
        url.searchParams.set('toAddress', input.fromAddress);
        url.searchParams.set('slippage', String(input.slippage));
        url.searchParams.set('integrator', opts.integrator ?? 'concierge');

        const quote = await fetch(url, { headers }).then(r => r.json());

        const hash = await ctx.walletClient.sendTransaction({
          to: quote.transactionRequest.to,
          data: quote.transactionRequest.data,
          value: BigInt(quote.transactionRequest.value),
        });

        return {
          txHash: hash,
          quoteId: quote.id,
          tool: quote.tool,
          expectedToAmount: quote.estimate.toAmountMin,
          expectedDuration: quote.estimate.executionDuration,
        };
      },
    },

    // Action: bridge OUT (mirror of bridgeIn, with fromChain = 5000)
    bridgeOut: { /* same shape, fromChain=5000 */ },

    // Action: get a quote without executing (used by plan/simulate phase)
    quoteRoute: { /* returns quote, no tx */ },

    // Read: status of an in-flight bridge
    getStatus: async (txHash: string) => {
      const r = await fetch(`${LIFI_API}/status?txHash=${txHash}`, { headers });
      return r.json();
    },
  };
}
```

## Mechanics / mental model

**Route selection:** Li.Fi's backend evaluates all available bridges (Stargate, Across, Hop, cBridge, Connext, Hyphen, etc.) + DEXes on source/destination chains and returns the optimal route by total cost (gas + bridge fees + slippage) AND duration. The default optimizes for cost; can override with `order=RECOMMENDED` / `FASTEST` / `CHEAPEST`.

**Bridge composition:** for cross-chain swaps (e.g., USDC on Ethereum → ETH on Mantle), Li.Fi composes: (a) DEX swap USDC→USDT on source, (b) Stargate bridge USDT to Mantle, (c) DEX swap USDT→ETH on Mantle. The `includedSteps` array shows each sub-step.

**Slippage:** end-to-end slippage across multi-step routes. Default 0.5%. Tight slippage on volatile assets (mETH bridges) may require higher tolerance.

**Execution duration:** typical Ethereum → Mantle bridge takes 5-15 minutes (Stargate ~10 min, Across ~3 min). Li.Fi's `executionDuration` is the expected total.

**Tx submission:** Li.Fi returns a single `transactionRequest` (calldata + value) — the user signs ONE tx on the source chain, Li.Fi's contracts handle the multi-step composition. No follow-up signature needed on the destination chain.

**Status polling:** after submission, `GET /status?txHash` polls the bridge state until `status: 'DONE'`. Concierge's tick `record()` phase polls every 30s for up to 30 minutes.

**On-chain contracts:** Li.Fi's diamond contracts are deployed on each supported chain. On Mantle: documented via `GET /tools/bridges` and `GET /tools/exchanges`.

## Risks + edge cases to handle in specs

1. **Multi-step bridge can fail mid-route.** Source tx confirmed but destination delivery fails. Mitigation: Li.Fi has a recovery flow (`POST /recovery`) but it's manual. Document the recovery URL in error states.
2. **Slippage breach on volatile assets.** Bridge transactions can revert if slippage exceeds tolerance. Mitigation: use Li.Fi's `toAmountMin` as the floor; surface to user before approval if floor is meaningful loss.
3. **Stale quotes.** Quotes have ~60s validity. If the user delays approval, re-quote before signing.
4. **API rate limits.** 60 req/min on free tier. Concierge's tick loop (every 60s default) could hit this if multiple users tick simultaneously. Mitigation: production API key + per-user rate limiting on the agent runtime.
5. **Bridge solvency.** Some bridges have had insolvency events. Li.Fi routes around known-broken bridges; user is exposed to the chosen bridge's solvency for in-flight funds.
6. **Asset existence on destination.** Bridging WBTC to Mantle may not work if no canonical WBTC representation exists there. Always check `GET /tokens?chains=5000` first.

## UNVERIFIED items for human follow-up

1. **Li.Fi API key application.** Need to confirm free-tier rate limits in production. Action: register an integrator account at https://li.fi/contact.
2. **Specific Mantle bridges Li.Fi uses.** Confirmation that Stargate / Across / Hop are all live on Mantle for our asset list (USDC, USDe, mETH). Action: `GET /tools/bridges?chains=5000` on integration day.
3. **Mantle ↔ Solana bridging.** Li.Fi may or may not support Solana destinations from Mantle (Solana isn't EVM). If user wants to off-ramp to Solana, document the path.
4. **Fee structure.** Integrator fee — Concierge can add a small (`integratorFee=0.001` = 0.1%) fee on Li.Fi quotes for revenue. Decide if/when to enable.

## Reference URLs

- Li.Fi docs: https://docs.li.fi/
- API reference: https://apidocs.li.fi/
- SDK: https://github.com/lifinance/sdk
- Widget: https://github.com/lifinance/widget
- Chain support page: https://li.fi/networks/

## Open questions for spec writer

1. **Default bridge preference.** RECOMMENDED (Li.Fi's optimization) vs FASTEST (lowest UX latency) vs CHEAPEST. (Recommend: RECOMMENDED.)
2. **Integrator fee.** Charge 0% (free) or 0.1% (revenue + tracks usage). (Recommend: 0% for v1 to remove friction; revisit v1.1.)
3. **Bridge status polling cadence.** 30s default vs more aggressive. (Recommend: 30s for first 5 min, 60s thereafter, give up at 30 min.)
4. **Cross-chain bridge UX.** Show the user the included sub-steps (e.g., "Swap USDC→USDT, bridge via Stargate, swap USDT→USDC on Mantle") or hide complexity. (Recommend: show in expandable detail; default collapsed.)
5. **Failure recovery.** Auto-trigger recovery flow on failed bridge, or notify user? (Recommend: notify + provide direct Li.Fi recovery URL.)
