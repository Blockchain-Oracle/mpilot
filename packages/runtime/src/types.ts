/**
 * Tick phases per `research/concierge/04-agent-runtime.md` § 2.1. `decide` is
 * out-of-loop (governance moment, runs only on `proposal.requiresApproval`)
 * and `record` is the post-execute attestation hook.
 */
export type TickPhase = 'plan' | 'simulate' | 'propose' | 'execute' | 'record';

export const TICK_PHASE_ORDER: readonly TickPhase[] = Object.freeze([
  'plan',
  'simulate',
  'propose',
  'execute',
  'record',
]);

/**
 * Per-phase result discriminator. Every phase returns one of three shapes:
 *   - `{ kind: 'continue', data }` — proceed to the next phase, carrying data
 *   - `{ kind: 'stop' }`            — clean early-return (NOOP / awaiting / etc)
 *   - `{ kind: 'error', error }`    — typed failure; tick aborts + logs + releases lock
 *
 * `data` is intentionally typed per phase below so the next phase's input is
 * constrained at the type system level (no `any` slip).
 */
export type PhaseOutcome<TData> =
  | { kind: 'continue'; data: TData }
  | { kind: 'stop'; reason: string }
  | { kind: 'error'; error: unknown };

/**
 * Phase function signatures. The orchestrator (tick.ts) is parameterised by
 * these so it's unit-testable without the actual phase implementations (which
 * land in stories 63-67). Each phase reads from the prior phase's `data`.
 */
export type PlanFn = (state: AgentState) => Promise<PhaseOutcome<Plan>>;
export type SimulateFn = (state: AgentState, plan: Plan) => Promise<PhaseOutcome<Sim>>;
export type ProposeFn = (state: AgentState, sim: Sim) => Promise<PhaseOutcome<Proposal>>;
export type ExecuteFn = (state: AgentState, proposal: Proposal) => Promise<PhaseOutcome<Exec>>;
export type RecordFn = (state: AgentState, exec: Exec) => Promise<PhaseOutcome<Attestation>>;

/**
 * Aggregate state loaded once per tick from Postgres. Treated as immutable
 * within a single tick — phases that need to mutate write directly to the
 * DB and the next tick re-loads.
 */
export interface AgentState {
  readonly agentId: string;
  readonly userId: string;
  readonly chain: 'mantle-mainnet' | 'mantle-sepolia';
  readonly goal: string;
  readonly policyId: string;
  /** Last 5 ticks for short-term context. Newest first. */
  readonly recentTicks: readonly { tickId: string; phase: TickPhase; ts: Date }[];
  /** Open positions across providers (Aave loans, Ethena sUSDe stake, etc.). */
  readonly openPositions: readonly { protocol: string; identifier: string }[];
}

export interface Plan {
  readonly intent: string;
  readonly providerCalls: readonly { provider: string; action: string; args: unknown }[];
}

export interface Sim {
  readonly ok: boolean;
  readonly gasEstimateWei: bigint;
  readonly expectedValueDeltaUsd: number;
  readonly warnings: readonly string[];
}

export interface Proposal {
  readonly id: string;
  readonly requiresApproval: boolean;
  readonly summary: string;
  readonly txParams: readonly { to: string; data: string; value: string }[];
}

export interface Exec {
  readonly txHashes: readonly string[];
  readonly blockNumbers: readonly bigint[];
}

export interface Attestation {
  readonly attestationUid: string;
  readonly recordedAt: Date;
}

/**
 * Final tick outcome. Discriminated by the phase that terminated the run.
 * `skipped` is the lock-contention path — another worker is already ticking
 * this agent; we exit clean without running anything.
 */
export type TickResult =
  | { kind: 'skipped'; reason: 'already_running' }
  | { kind: 'stopped'; phase: TickPhase; reason: string }
  | { kind: 'errored'; phase: TickPhase; error: unknown }
  | { kind: 'completed'; attestation: Attestation };

export interface TickConfig {
  readonly agentId: string;
  readonly loadState: (agentId: string) => Promise<AgentState>;
  readonly plan: PlanFn;
  readonly simulate: SimulateFn;
  readonly propose: ProposeFn;
  readonly execute: ExecuteFn;
  readonly record: RecordFn;
  /** Injected for testability — production caller passes `createLock(redis)`. */
  readonly lock: TickLock;
  /** Optional structured logger. Defaults to a silent no-op logger if omitted. */
  readonly logger?: TickLogger;
  /** Lock TTL (ms). Default 60_000 — long enough for a 6-phase tick. */
  readonly lockTtlMs?: number;
}

export interface TickLock {
  acquire(key: string, ttlMs: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

/**
 * Minimal logger surface — concrete impl is pino in production, no-op in
 * tests. Avoids leaking pino types into every caller.
 */
export interface TickLogger {
  info(obj: Record<string, unknown>, msg?: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
}
