<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/meth-staking

mETH (Mantle liquid-staked ETH) action provider for the mPilot agent. Acquire mETH via the liquid DEX route, read exchange/yield rates, and price an unwrap back to WETH — with ERC-8004 attestation hooks.

## Quickstart

```ts
import { createMantleDexProvider } from '@mpilot/mantle-dex';
import { createMethStakingProvider } from '@mpilot/meth-staking';

// mETH staking delegates its swap to a DEX provider — inject one.
const dexProvider = createMantleDexProvider({ walletClient, publicClient, chain: 'mantle-mainnet' });
const meth = createMethStakingProvider({ publicClient, chain: 'mantle-mainnet' }, { dexProvider });

const rate = await meth.actions.getExchangeRate.invoke({});
const acquired = await meth.actions.acquire.invoke({ amountWeth: '1000000000000000000' }); // 1 WETH → mETH
```

## Actions

| Action | Kind | Description |
|---|---|---|
| `getBalance` | read | mETH balance + WETH-equivalent value |
| `getExchangeRate` | read | mETH ↔ ETH exchange rate |
| `getYieldRate` | read | Annualized staking yield |
| `getUnwrapToWETH` | read | Quote unwinding mETH → WETH via the DEX |
| `acquire` | write | Acquire mETH from WETH through the best liquid route |

> **Dependency**: `createMethStakingProvider(opts, { dexProvider })` requires a DEX provider as its second argument. Mainnet-only (chain 5000). Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot).
