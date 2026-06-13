export { createLock } from './lock.ts';
export { loadAgentState } from './state.ts';
export { tick } from './tick.ts';
export type {
  AgentState,
  Attestation,
  Exec,
  ExecuteFn,
  PhaseOutcome,
  Plan,
  PlanFn,
  Proposal,
  ProposeFn,
  RecordFn,
  Sim,
  SimulateFn,
  TickConfig,
  TickLock,
  TickLogger,
  TickPhase,
  TickResult,
} from './types.ts';
export { TICK_PHASE_ORDER } from './types.ts';
