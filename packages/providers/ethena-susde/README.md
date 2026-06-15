<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/ethena-susde

Ethena sUSDe action provider for the mPilot agent on Mantle. Wrap/unwrap USDe ↔ sUSDe and read the carry trade vs Aave, with ERC-8004 attestation hooks.

## Quickstart

```ts
import { createEthenaSusdeProvider } from '@mpilot/ethena-susde';

const ethena = createEthenaSusdeProvider({ walletClient, publicClient, chain: 'mantle-mainnet' });

const rate = await ethena.actions.getYieldRate.invoke({});
const carry = await ethena.actions.getCarryVsAave.invoke({}); // sUSDe APY minus Aave USDe borrow APY
const wrap = await ethena.actions.wrapToSusde.invoke({ amount: '1000000000000000000' }); // 1 USDe
```

## Actions

| Action | Kind | Description |
|---|---|---|
| `getYieldRate` | read | Current sUSDe staking yield |
| `getCarryVsAave` | read | Net carry of the sUSDe-vs-Aave-USDe-borrow loop |
| `wrapToSusde` | write | Stake USDe → sUSDe |
| `unwrapToUSDe` | write | Redeem sUSDe → USDe |

Mainnet-only (chain 5000). Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot).
