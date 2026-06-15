<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/erc8004

ERC-8004 identity + reputation action provider for the mPilot agent. Register an agent, write per-action attestations (`giveFeedback`), and read back reputation — the on-chain verifiability layer (ADR-004).

## Quickstart

```ts
import { createErc8004Provider } from '@mpilot/erc8004';

const erc8004 = createErc8004Provider({ walletClient, publicClient, chain: 'mantle-sepolia' });

await erc8004.actions.registerAgent.invoke({ metadataUri: 'ipfs://…' });
await erc8004.actions.attestAction.invoke({ schema: 'concierge.aave.supply.v1', payload: { /* … */ } });
const rep = await erc8004.actions.readReputation.invoke({ agentId: '123' });
```

## Actions

| Action | Kind | Description |
|---|---|---|
| `registerAgent` | write | Register the agent in the ERC-8004 Identity Registry |
| `attestAction` | write | Write a `giveFeedback` attestation for a completed action |
| `readFeedback` | read | Read raw feedback entries |
| `readReputation` | read | Aggregate reputation score + recent attestations |

Canonical Mantle registries are read from `@mpilot/shared/addresses`. Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot).
