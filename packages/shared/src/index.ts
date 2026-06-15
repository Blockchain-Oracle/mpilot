// Barrel exports for @concierge-mantle/shared.

export {
  ADDRESSES,
  type AddressPath,
  addressesFor,
  MAINNET_PENDING_ADDRESS_SLOTS,
  type MainnetAddressPath,
  SEPOLIA_PENDING_ADDRESS_SLOTS,
  type SepoliaAddressPath,
  ZERO_ADDRESS,
} from './addresses.ts';
export { assertNumericChainId, chainFor, mantleMainnet, mantleSepolia } from './chains.ts';
// UI-facing shapes consumed by the dashboard, MCP iframe cards, skill, docs.
// Pure types + constants — no runtime deps. See file header for rationale.
export { GOAL_EXAMPLES, type GoalChip, type GoalChipType } from './goalExamples.ts';
export type {
  ActionKind,
  Address,
  AgentId,
  EvmChainId,
  Hex,
  ModelRoutingPhase,
  ProviderName,
  TickLoopPhase,
} from './types.ts';
export {
  agentId,
  agentIdFromHex,
  agentIdFromJSON,
  agentIdToHex,
  agentIdToJSON,
  isAgentId,
} from './types.ts';
export {
  type ISO8601,
  ORCHESTRATED_PHASE_OF,
  type OrchestratedPhase as UIOrchestratedPhase,
  type ProposalFields,
  type RiskFlag,
  type RiskSeverity,
  type SimulationOutput,
  type TickActionData,
  type TickUpdateEnvelope,
} from './uiTypes.ts';
