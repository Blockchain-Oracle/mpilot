// Browser-safe subset of the package surface. Excludes session-key
// persistence + EOA-fallback modules, both of which import
// `@concierge-mantle/db` (pg / bullmq / ioredis — Node-only). The web
// onboarding flow only needs to deploy a smart account; everything else
// belongs to the worker.

export type { ConnectConciergeAccountConfig } from './connectAccount.ts';
export { connectToConciergeAccount } from './connectAccount.ts';
export {
  CHAIN_CONFIGS,
  ENTRYPOINT_V07_ADDRESS,
  MANTLE_MAINNET,
  MANTLE_SEPOLIA,
} from './constants.ts';
export type { CreateConciergeAccountConfig } from './createAccount.ts';
export { createConciergeAccount } from './createAccount.ts';
export type { ConciergeAccount, SupportedChain } from './types.ts';
