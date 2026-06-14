export type { ActionContext } from './_context.ts';
// Context7 audit C2 (2026-06-14): `hashActionPayload` (EIP-712 typed-data)
// removed. Production attestation hash is keccak256(canonicalize(envelope))
// per ADR-004 — see `attestAction.ts` and `@concierge-mantle/attestation`.
export type {
  Erc8004Chain,
  Erc8004Provider,
  Erc8004ProviderOptions,
} from './provider.ts';
export { createErc8004Provider } from './provider.ts';
export type { KnownSchemaName } from './schemas.ts';
export { SCHEMA_NAMES, schemaIdFor } from './schemas.ts';
