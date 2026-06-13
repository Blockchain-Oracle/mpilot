import { ConciergeError } from '@concierge/sdk';
import { sanitizeError } from '../sanitize.ts';
import type { AgentState, PhaseOutcome, Plan, Sim } from '../types.ts';
import { type ActionSimResult, computeDeltaState, type DeltaState } from './deltaState.ts';

/**
 * One provider's simulator for a SINGLE action descriptor. Returns the
 * predicted state delta + gas. Throws ONLY on infra failures (network /
 * malformed call) — on-chain reverts MUST be captured as `{ ok: false,
 * revertReason }`. This is the load-bearing invariant: simulate refuses
 * to throw on revert so the propose phase can render the revert reason
 * to the user instead of the tick aborting opaquely.
 */
export type ActionSimulator = (
  preState: AgentState,
  args: Readonly<Record<string, unknown>>,
  signal: AbortSignal,
) => Promise<ActionSimResult>;

/**
 * Registry keyed by `${provider}:${action}`. The DI shape — caller wires
 * up the concrete simulators per provider (stories 30/32/34 ship the
 * actual viem `simulateContract` calls). Tests inject stubs.
 */
export type SimulatorRegistry = ReadonlyMap<string, ActionSimulator>;

/**
 * Discriminated SimError union. Operators dashboard each kind separately
 * because the response policy differs: `revert` retries with adjusted
 * args, `oracle-stale` waits for the next oracle update, `hf-breach`
 * tightens the plan, `unknown-action` is a registry wiring bug, `aborted`
 * means the orchestrator tick budget elapsed.
 */
export type SimError =
  | {
      kind: 'revert';
      failedAtIndex: number;
      provider: string;
      action: string;
      revertReason: string;
    }
  | { kind: 'oracle-stale'; failedAtIndex: number; provider: string; action: string }
  | { kind: 'hf-breach'; healthFactorAfter: bigint; floor: bigint }
  | { kind: 'unknown-action'; provider: string; action: string }
  | { kind: 'gas-overrun'; failedAtIndex: number; gasUsed: bigint; blockGasLimit: bigint }
  | { kind: 'aborted'; failedAtIndex: number };

export interface RunSimulateInputs {
  readonly preState: AgentState;
  readonly plan: Plan;
  readonly registry: SimulatorRegistry;
  /** Initial HF before any plan action — read once at the tick boundary. */
  readonly healthFactorBefore: bigint;
}

export interface RunSimulateOptions {
  /**
   * Minimum HF the plan must preserve (Aave scale, 1e18). Default 1.5e18.
   * Plans whose predicted HF drops below this floor return `ok: false`.
   */
  readonly healthFactorFloor?: bigint;
  /** Block gas limit sanity bound. Default 30M (Mantle nominal). */
  readonly blockGasLimit?: bigint;
  readonly abortSignal?: AbortSignal;
}

export interface DetailedSim extends Sim {
  /** Predicted delta — used by the propose phase to render the before/after view. */
  readonly deltaState: DeltaState;
  /** Discriminated failure cause (populated iff `ok === false`). */
  readonly error?: SimError;
}

const DEFAULT_HF_FLOOR = 1_500_000_000_000_000_000n; // 1.5e18
const DEFAULT_BLOCK_GAS_LIMIT = 30_000_000n;

/**
 * Simulate the plan's actions in order. Stops early on the FIRST failed
 * action (revert / oracle / gas-overrun / abort) — wasted simulation
 * gas is real money on a hosted RPC, and downstream actions are likely
 * predicated on the success of the failed one.
 *
 * Returns `{ ok: false, error }` for DOMAIN failures (revert, oracle,
 * HF, gas, abort) — these are recoverable, the propose phase shows the
 * user. THROWS only for INFRA failures the orchestrator should treat as
 * phase-level errors (simulator infra crash, malformed action descriptor).
 */
export async function runSimulate(
  inputs: RunSimulateInputs,
  options: RunSimulateOptions = {},
): Promise<PhaseOutcome<DetailedSim>> {
  const floor = options.healthFactorFloor ?? DEFAULT_HF_FLOOR;
  const blockGasLimit = options.blockGasLimit ?? DEFAULT_BLOCK_GAS_LIMIT;
  const signal = options.abortSignal ?? new AbortController().signal;

  const perAction: ActionSimResult[] = [];
  let totalGas = 0n;
  let error: SimError | undefined;

  for (let i = 0; i < inputs.plan.providerCalls.length; i++) {
    if (signal.aborted) {
      error = { kind: 'aborted', failedAtIndex: i };
      break;
    }
    const call = inputs.plan.providerCalls[i];
    if (!call) continue;
    const key = `${call.provider}:${call.action}`;
    const simulator = inputs.registry.get(key);
    if (!simulator) {
      error = { kind: 'unknown-action', provider: call.provider, action: call.action };
      break;
    }

    let result: ActionSimResult;
    try {
      result = await simulator(
        inputs.preState,
        (call.args ?? {}) as Readonly<Record<string, unknown>>,
        signal,
      );
    } catch (err) {
      // Infra failure: the simulator itself crashed (network, malformed
      // ABI, etc). Throw a typed error so the orchestrator's runPhase
      // wraps it as { cause: 'thrown' } — distinct from domain reverts.
      throw new ConciergeError(
        'RpcError',
        `[@concierge/runtime] runSimulate: simulator '${key}' threw: ${sanitizeError(err).message}`,
        sanitizeError(err),
        { failedAtIndex: i, provider: call.provider, action: call.action },
      );
    }
    perAction.push(result);
    totalGas += result.gasUsed;

    if (!result.ok) {
      if (result.oracleStale) {
        error = {
          kind: 'oracle-stale',
          failedAtIndex: i,
          provider: call.provider,
          action: call.action,
        };
      } else {
        error = {
          kind: 'revert',
          failedAtIndex: i,
          provider: call.provider,
          action: call.action,
          revertReason: sanitizeError(result.revertReason ?? 'unknown revert').message,
        };
      }
      break;
    }
    if (result.gasUsed > blockGasLimit) {
      error = { kind: 'gas-overrun', failedAtIndex: i, gasUsed: result.gasUsed, blockGasLimit };
      break;
    }
  }

  const deltaState = computeDeltaState({
    healthFactorBefore: inputs.healthFactorBefore,
    perAction,
  });

  // HF floor check runs LAST (only meaningful if no upstream failure).
  if (error === undefined && deltaState.healthFactorAfter < floor) {
    error = {
      kind: 'hf-breach',
      healthFactorAfter: deltaState.healthFactorAfter,
      floor,
    };
  }

  const ok = error === undefined;
  const warnings: string[] = [];
  if (deltaState.oracleChecks.stale) warnings.push('oracle-stale-detected');

  const sim: DetailedSim = {
    ok,
    gasEstimateWei: totalGas,
    expectedValueDeltaUsd: 0, // populated in story-65 (propose) via USD pricing
    warnings,
    deltaState,
    ...(error !== undefined && { error }),
  };
  return { kind: 'continue', data: sim };
}
