<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/runtime

The composition layer that wires every mPilot provider into the agent's tool registry. One call gives you the `ProviderToolFactory[]` that `createChatHandler` / `getVercelAITools` / the tick loop consume.

## Quickstart

```ts
import { assembleProviders } from '@mpilot/runtime';
import { getVercelAITools } from '@mpilot/sdk';

// Execute mode: full tool set, writes sign + send via the EOA.
const factories = assembleProviders({ chain: 'mantle-mainnet', walletClient, publicClient });
const tools = getVercelAITools({ chainId: 5000 }, factories);

// Propose mode: wallet writes become unsigned previews; other providers expose reads only.
const chatFactories = assembleProviders({ mode: 'propose', chain: 'mantle-sepolia', publicClient });
```

## What it does

- Instantiates all 8 providers (wallet, DEX, Aave, Ethena, Ondo, mETH, Li.Fi, ERC-8004), handling the
  inter-provider wiring (mETH's required `dexProvider`, the mainnet-only providers).
- **`namespaceTool`** prefixes every tool name per provider (`wallet_`, `dex_`, `aave_`, …) so the
  registry never collides on the duplicate bare names several providers share (`quote`, `getBalance`,
  `getYieldRate`).
- Splits **`execute`** vs **`propose`** modes for server-custody vs client-signed (chat) surfaces.

This package depends on the concrete providers; it lives outside the provider-agnostic core
(`@mpilot/tools` / `@mpilot/agent` / `@mpilot/sdk`) to avoid a dependency cycle. Part of
[mPilot](https://github.com/Blockchain-Oracle/mpilot).
