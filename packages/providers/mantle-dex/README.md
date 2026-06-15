<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/mantle-dex

Best-route DEX action provider for the mPilot agent on Mantle. Quotes across **Merchant Moe, Agni, FusionX, WOOFi, and Li.Fi** in parallel and executes the winning route, with ERC-8004 attestation hooks.

## Quickstart

```ts
import { createMantleDexProvider } from '@mpilot/mantle-dex';

const dex = createMantleDexProvider({ walletClient, publicClient, chain: 'mantle-mainnet' });

// Read-only: compare every venue
const q = await dex.actions.quote.invoke({
  tokenIn: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8', // WMNT
  tokenOut: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9', // USDC
  amountIn: '1000000000000000000', // 1 WMNT (base units, decimal string)
});

// Write: re-quotes at execution, handles ERC-20 approval, returns { txHash, venue, amountOut }
const swap = await dex.actions.swap.invoke({ ...q, recipient: '0xYou', slippageBps: 50 });
```

## Actions

| Action | Kind | Description |
|---|---|---|
| `quote` | read | Best `amountOut` across all five venues + per-venue breakdown |
| `swap`  | write | Execute the best route; re-quotes at execution time, auto-approves, enforces `amountOutMin` |

Amounts are decimal strings of base units. Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot) — a composable, framework-agnostic DeFi agent toolkit.
