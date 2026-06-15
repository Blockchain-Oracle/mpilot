<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/ondo-usdy

Ondo USDY (tokenized US Treasuries RWA) action provider for the mPilot agent on Mantle. Read-only yield + balance views with ERC-8004 attestation hooks.

## Quickstart

```ts
import { createOndoUsdyProvider } from '@mpilot/ondo-usdy';

const ondo = createOndoUsdyProvider({ publicClient, chain: 'mantle-mainnet' });

const bal = await ondo.actions.getBalance.invoke({ user: '0xYou' }); // USDY balance + USD value
const yield_ = await ondo.actions.getYieldRate.invoke({});
const accrual = await ondo.actions.getRateAccrual.invoke({});
```

## Actions

| Action | Kind | Description |
|---|---|---|
| `getBalance` | read | USDY balance + USD valuation |
| `getYieldRate` | read | Current USDY yield |
| `getRateAccrual` | read | Per-period rate accrual on the rebasing token |

Mainnet-only (chain 5000). Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot).
