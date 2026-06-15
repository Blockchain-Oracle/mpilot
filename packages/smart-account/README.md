<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/smart-account

ERC-4337 smart-account layer for mPilot: ZeroDev kernel accounts, Pimlico bundler/paymaster routing, scoped session keys, call policies, and an EOA-fallback signing queue. The non-custodial execution backbone (ADR-010).

## Quickstart

```ts
import {
  createConciergeAccount,
  createBundlerClient,
  createPaymasterClient,
  issueSessionKey,
  createConciergePolicy,
} from '@mpilot/smart-account';

const bundler = createBundlerClient({ chain, pimlicoApiKey });
const account = await createConciergeAccount({ owner, chain });
```

## What it ships

- **Accounts** — `createConciergeAccount` / `connectToConciergeAccount` over ZeroDev kernel (EntryPoint v0.7).
- **Bundler + paymaster** — `createBundlerClient` / `createPaymasterClient` routed through Pimlico; gas sponsorship policies.
- **Session keys** — `issueSessionKey` / `loadSessionKey` / `persistSessionKey` / `revokeSessionKey`, encrypted at rest (`SessionKeySecret`).
- **Policies** — `createConciergePolicy`, `createCallPolicy`, `createErc20TransferLimit`, `createTimeFramePolicy`.
- **EOA fallback** — `proposeForUser` + a pending-signature queue (`enqueue` / `getPending` / `sendSignedTx`) for when no session key is present.
- **`emergencyStop`** — revoke + halt.

Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot).
