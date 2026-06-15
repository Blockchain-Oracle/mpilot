// @concierge-mantle/sdk — META package (story-22 amended, ADR-014/016/018/019):
// one install + one import for the Concierge core. Curated named re-exports
// (not `export *`) so the public surface is deliberate.
//
// The agent-runtime exports (`createConcierge`, `Concierge`) land when
// `@concierge-mantle/agent` is born in Epic E5 — no story before E5 creates that
// package, and stubbing a fake runtime here is a banned hot-path mock. See
// the deferral addendum in docs/stories/story-22-sdk-skeleton.md.

// SEPOLIA_PENDING_ADDRESS_SLOTS / MAINNET_PENDING_ADDRESS_SLOTS are the programmatic
// guards for `ConciergeRegistry.*()` zero-address placeholders — SDK-only consumers
// must be able to detect pending slots without reading the README.
// UI-facing tick + proposal types — derived from the designer prototype's
// actual data bindings. The web app, MCP iframe cards, skill, and docs site
// all consume these shapes. Re-exported here so SDK consumers get them
// without depending on @concierge-mantle/shared directly.
export {
  type AddressPath,
  GOAL_EXAMPLES,
  type GoalChip,
  type GoalChipType,
  type ISO8601,
  MAINNET_PENDING_ADDRESS_SLOTS,
  type MainnetAddressPath,
  type ProposalFields,
  type RiskFlag,
  type RiskSeverity,
  SEPOLIA_PENDING_ADDRESS_SLOTS,
  type SepoliaAddressPath,
  type SimulationOutput,
  type TickActionData,
  type TickUpdateEnvelope,
} from '@concierge-mantle/shared';
export {
  bigintSafeStringify,
  CARD_SCHEMAS,
  type ConciergeAgentLike,
  type ConciergeTool,
  createConciergeTools,
  type JsonSerializable,
  type ProviderToolFactory,
  type SerializablePortfolioCard,
  SerializablePortfolioCardSchema,
  type SerializableProposalCard,
  SerializableProposalCardSchema,
  type SerializableReputationCard,
  SerializableReputationCardSchema,
  type SerializableTickCard,
  SerializableTickCardSchema,
  safeParseSerializablePortfolioCard,
  safeParseSerializableProposalCard,
  safeParseSerializableReputationCard,
  safeParseSerializableTickCard,
  TICK_PHASE_VALUES,
  type TickPhase,
  tool,
  type UICardId,
} from '@concierge-mantle/tools';
export { getVercelAITools, toVercelAITool } from '@concierge-mantle/vercel-ai';
export { type ConciergeConfig, ConfigSchema, loadConfig } from './config.ts';
export {
  defaultModel,
  SUPPORTED_PROVIDERS,
  type SupportedProvider,
} from './defaultModel.ts';
export {
  CONCIERGE_ERROR_TYPES,
  ConciergeError,
  type ConciergeErrorType,
  ConfigError,
  type ConfigErrorMetadata,
  isConciergeErrorType,
} from './errors.ts';
export { ConciergeRegistry } from './registry.ts';
// Chain-aware URL helpers (MantleScan tx/address, IPFS attestations, agent share).
export {
  agentShareUrl,
  attestationIpfsUrl,
  attestationMantleScanUrl,
  mantleScanAddressUrl,
  mantleScanTxUrl,
  type SupportedChainId,
} from './urls.ts';
