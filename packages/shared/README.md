<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/shared

Zero-dependency shared foundation for mPilot: canonical on-chain addresses, viem chain configs, ABIs, and core types. **One source of truth** so no package re-types a Mantle address or chain id.

## Quickstart

```ts
import { addressesFor, mantleMainnet, mantleSepolia, ZERO_ADDRESS } from '@mpilot/shared';
import { erc20Abi, ipoolAbi } from '@mpilot/shared/abi';

const net = addressesFor(5000);
net.tokens.USDC; // canonical Mantle USDC
net.aave.pool;   // Aave V3 pool
```

## Exports

- **`addressesFor(chainId)` / `ADDRESSES`** — frozen, on-chain-verified addresses (tokens, Aave, ERC-8004,
  Li.Fi, DEX routers) for Mantle Mainnet (5000) + Sepolia (5003).
- **`mantleMainnet` / `mantleSepolia` / `chainFor`** — viem chain configs.
- **`@mpilot/shared/abi`** — `erc20Abi`, `ipoolAbi`, `iaaveOracleAbi`, ERC-8004 + ZeroDev kernel ABIs.
- **Types** — `Address`, `Hex`, `EvmChainId`, `AgentId`, `TickLoopPhase`, plus UI-facing tick/proposal shapes.

Addresses are FROZEN and verified via on-chain `cast call` — do not edit without re-verifying. Part of
[mPilot](https://github.com/Blockchain-Oracle/mpilot).
