// Re-export UI-facing types from @concierge-mantle/shared so agent consumers
// (worker, SDK) get them via the agent barrel without depending on shared
// directly. The types LIVE in shared because the SDK also re-exports them and
// `agent → sdk → agent` would be a build cycle.
export {
  GOAL_EXAMPLES,
  type GoalChip,
  type GoalChipType,
  type ISO8601,
  ORCHESTRATED_PHASE_OF,
  type ProposalFields,
  type RiskFlag,
  type RiskSeverity,
  type SimulationOutput,
  type TickActionData,
  type TickUpdateEnvelope,
} from '@concierge-mantle/shared';
export {
  type AuthGate,
  type CreateChatHandlerDeps,
  createChatHandler,
  DEFAULT_MAX_BODY_BYTES,
  DEFAULT_MAX_STEPS,
  MAX_GOAL_LENGTH,
  renderSystemPrompt,
  type SystemPromptContext,
} from './chat/index.ts';
export { createLock } from './lock.ts';
export { parseGoal, quickChips } from './parseGoal.ts';
export type { ActionSimResult, ComputeDeltaStateInput, DeltaState } from './phases/deltaState.ts';
export { computeDeltaState } from './phases/deltaState.ts';
export type {
  ApprovedProposal,
  EoaQueueEnqueue,
  ExecutionRepository,
  ExecutorClient,
  RunExecuteDeps,
  RunExecuteInputs,
  SessionKeyLoader,
  UserOpReceipt,
} from './phases/execute.ts';
export { runExecute } from './phases/execute.ts';
export {
  EXECUTE_OUTCOMES,
  type ExecuteOutcome,
  type ExecuteOutcomeKind,
  type ExecutionRow,
  executionRowSchema,
} from './phases/executeSchema.ts';
export type { RunPlanInputs, RunPlanOptions } from './phases/plan.ts';
export { runPlan } from './phases/plan.ts';
export {
  type ActionDescriptor,
  actionDescriptorSchema,
  type LlmPlan,
  type PlanIntent,
  planIntentSchema,
  planSchema,
} from './phases/planSchema.ts';
export {
  filterToPlanTools,
  isBannedToolName,
  PLAN_BANNED_TOOL_NAMES,
  type PlanBannedToolName,
} from './phases/planTools.ts';
export {
  PROPOSAL_DECISION_KINDS,
  PROPOSAL_KINDS,
  PROPOSAL_PROTOCOLS,
  PROPOSAL_STATUSES,
  type ProposalCreatedEvent,
  type ProposalDecision,
  type ProposalDecisionKind,
  type ProposalKind,
  type ProposalProtocol,
  type ProposalStatus,
  proposalCreatedEventSchema,
  proposalDecisionSchema,
} from './phases/proposalSchema.ts';
export type {
  NewProposalRow,
  ProposalPolicy,
  ProposalPublisher,
  ProposalRepository,
  RunProposeDeps,
  RunProposeInputs,
} from './phases/propose.ts';
export { decideRequiresApproval, runPropose } from './phases/propose.ts';
export type {
  AttestationPayloadBuilder,
  AttestationRetryQueue,
  ConfirmedExecution,
  Erc8004Client,
  ExecutionAttestationRepository,
  RecordLogEntry,
  RunRecordDeps,
  RunRecordInputs,
} from './phases/record.ts';
export { runRecord } from './phases/record.ts';
export { runRecordFallback } from './phases/recordFallback.ts';
export {
  type AttestationPayload,
  attestationPayloadSchema,
  RECORD_OUTCOMES,
  type RecordOutcome,
  type RecordOutcomeKind,
  recordOutcomeSchema,
} from './phases/recordSchema.ts';
export type {
  ActionSimulator,
  DetailedSim,
  ProviderActionKey,
  RunSimulateInputs,
  RunSimulateOptions,
  SimError,
  SimulatorRegistry,
} from './phases/simulate.ts';
export { providerActionKey, runSimulate } from './phases/simulate.ts';
export {
  type Publisher,
  publishTickUpdate,
  type Subscriber,
  subscribeToTickUpdates,
  tickChannel,
} from './pubsub.ts';
export { sanitizeError, sanitizeMessage } from './sanitize.ts';
export { tick } from './tick.ts';
export type {
  AgentState,
  Attestation,
  Exec,
  ExecuteFn,
  OrchestratedPhase,
  PhaseOutcome,
  Plan,
  PlanFn,
  Proposal,
  ProposeFn,
  RecordFn,
  ReleaseOutcome,
  Sim,
  SimulateFn,
  TickConfig,
  TickLock,
  TickLogger,
  TickPhase,
  TickResult,
} from './types.ts';
export { ORCHESTRATED_PHASES } from './types.ts';
