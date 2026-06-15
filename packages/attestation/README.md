<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/attestation

ERC-8004 attestation plumbing for mPilot: deterministic canonicalization, feedback-hash computation, IPFS pinning, and agent-history loading. The data layer behind every "record" phase (ADR-004).

## Quickstart

```ts
import { canonicalize, computeFeedbackPair, getOrFetchPayload, writeAttestation } from '@mpilot/attestation';

const { hash } = computeFeedbackPair(envelope); // keccak256(canonicalize(envelope))
```

## Exports

- **`canonicalize`** — stable JSON canonicalization (the bytes that get hashed).
- **`computeFeedbackHash` / `computeFeedbackPair`** — the ERC-8004 `giveFeedback` hash.
- **`getOrFetchPayload` / `createGatewayFetcher`** — IPFS-cache-backed payload retrieval with shape guards.
- **`pinReceipt` / pin service** — pin attestation payloads to IPFS.
- **`writeAttestation` / `loadAgentHistory`** — persist + read back an agent's attestation history.

Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot).
