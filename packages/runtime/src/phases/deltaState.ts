/**
 * Predicted on-chain delta the propose phase shows the user (and that
 * the policy engine checks before approval). One DeltaState per tick is
 * aggregated across ALL actions in the plan — `runSimulate` builds it
 * by reducing per-action SimResults in sequence.
 *
 * Convention: positive bigint = balance INCREASE, negative = DECREASE.
 * Same for debt: positive = additional borrowing, negative = repayment.
 *
 * `healthFactor*` are scaled 1e18 (Aave V3 convention) so an HF of 1.5
 * is `1500000000000000000n`. Avoids float drift in policy comparisons.
 */
export interface DeltaState {
  readonly healthFactorBefore: bigint;
  readonly healthFactorAfter: bigint;
  /** Per-token balance changes. Token key is the ERC-20 address (checksummed). */
  readonly balanceDeltas: Readonly<Record<string, bigint>>;
  /** Per-token debt changes. */
  readonly debtDeltas: Readonly<Record<string, bigint>>;
  readonly oracleChecks: { readonly stale: boolean };
}

/**
 * Per-action simulation result returned by an `ActionSimulator`. The
 * orchestrator (simulate.ts) merges these into a single DeltaState.
 *
 * `ok: false` means the action's eth_call reverted OR an oracle check
 * failed OR the gas estimate exceeded the block limit. The caller's
 * `error` payload is captured separately on the Sim envelope so the
 * propose phase can render which action broke and why.
 */
export interface ActionSimResult {
  readonly ok: boolean;
  readonly gasUsed: bigint;
  readonly balanceDeltas: Readonly<Record<string, bigint>>;
  readonly debtDeltas: Readonly<Record<string, bigint>>;
  /** Aave V3 HF after THIS action (scaled 1e18). */
  readonly healthFactorAfter: bigint;
  readonly oracleStale: boolean;
  /** Set when `ok === false`. Sanitized per runtime/sanitize.ts. */
  readonly revertReason?: string;
}

export interface ComputeDeltaStateInput {
  readonly healthFactorBefore: bigint;
  readonly perAction: readonly ActionSimResult[];
}

/**
 * Pure aggregator: reduce per-action results into ONE DeltaState. Sum is
 * commutative over balance/debt deltas (additive bigint accumulation),
 * but HF is non-additive — we carry the LAST successful action's
 * `healthFactorAfter` because that's the predicted state after the full
 * plan executes in order.
 *
 * Stops carrying HF forward as soon as an action fails (the propose
 * phase shouldn't trust HF predictions past the failure point).
 * `oracleChecks.stale` ORs across all actions — any stale oracle in the
 * plan poisons the whole tick (ADR-008).
 */
export function computeDeltaState(input: ComputeDeltaStateInput): DeltaState {
  const balanceDeltas: Record<string, bigint> = {};
  const debtDeltas: Record<string, bigint> = {};
  let healthFactorAfter = input.healthFactorBefore;
  let oracleStale = false;

  for (const r of input.perAction) {
    for (const [token, delta] of Object.entries(r.balanceDeltas)) {
      balanceDeltas[token] = (balanceDeltas[token] ?? 0n) + delta;
    }
    for (const [token, delta] of Object.entries(r.debtDeltas)) {
      debtDeltas[token] = (debtDeltas[token] ?? 0n) + delta;
    }
    if (r.oracleStale) oracleStale = true;
    if (!r.ok) break; // freeze HF projection at the failure point
    healthFactorAfter = r.healthFactorAfter;
  }

  return {
    healthFactorBefore: input.healthFactorBefore,
    healthFactorAfter,
    balanceDeltas: Object.freeze(balanceDeltas),
    debtDeltas: Object.freeze(debtDeltas),
    oracleChecks: Object.freeze({ stale: oracleStale }),
  };
}
