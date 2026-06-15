<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/lifi-bridge

Li.Fi cross-chain bridge action provider for the mPilot agent. Quote, execute, and track bridge transfers in/out of Mantle, with ERC-8004 attestation hooks.

## Quickstart

```ts
import { createLifiBridgeProvider } from '@mpilot/lifi-bridge';

const lifi = createLifiBridgeProvider({ walletClient, publicClient });

const route = await lifi.actions.quote.invoke({
  fromChainId: 1,
  toChainId: 5000,
  fromToken: '0x...',
  toToken: '0x...',
  fromAmount: '1000000',
});
const sent = await lifi.actions.bridge.invoke(route);
const status = await lifi.actions.getStatus.invoke({ txHash: sent.txHash });
```

## Actions

| Action | Kind | Description |
|---|---|---|
| `quote` | read | Best Li.Fi route + fee/gas estimate |
| `bridge` | write | Execute the bridge transfer (approval handled) |
| `getStatus` | read | Poll cross-chain delivery status by tx hash |

Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot).
