<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/wallet

Basic wallet primitives for the mPilot agent on Mantle — balances, transfers, approvals, and native wrap/unwrap. Pure viem, no protocol dependencies. The demo-critical building blocks ("what's my balance", "send 5 USDC").

## Modes

Every write tool runs in one of two modes, chosen at construction:

- **`execute`** (default) — signs + broadcasts via a `walletClient`, returns `{ kind: 'executed', txHash, … }`.
- **`propose`** — needs only a `publicClient`; encodes the calldata and returns `{ kind: 'proposal', to, value, data, chainId, summary }` for the caller to sign client-side (e.g. the chat surface, where the user signs in their own wallet).

```ts
import { createWalletProvider } from '@mpilot/wallet';

// Execute mode (server EOA)
const w = createWalletProvider({ walletClient, publicClient, chain: 'mantle-sepolia' });
await w.actions.transferErc20.invoke({ token: '0x…', recipient: '0x…', amount: '5000000' });

// Propose mode (no custody) — returns an unsigned tx for the client to sign
const p = createWalletProvider({ mode: 'propose', publicClient, chain: 'mantle-sepolia' });
const proposal = await p.actions.transferNative.invoke({ recipient: '0x…', amount: '1000000000000000' });
```

## Actions

| Action | Kind | Description |
|---|---|---|
| `getNativeBalance` | read | Native MNT balance |
| `getErc20Balance` | read | Any ERC-20 balance + decimals + symbol |
| `transferNative` | write | Send native MNT |
| `transferErc20` | write | Send an ERC-20 token |
| `approveErc20` | write | Set an ERC-20 spender allowance |
| `wrapNative` / `unwrapNative` | write | MNT ↔ WMNT via the WETH9 interface |

Amounts are decimal strings of base units. Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot).
