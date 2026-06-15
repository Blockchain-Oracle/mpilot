/**
 * UI-facing tick + proposal types.
 *
 * The worker-internal types in `./types.ts` (`Plan`, `Sim`, `Proposal`, `Exec`,
 * `Attestation`) describe what each phase function returns to the orchestrator.
 * These are different — they are the SHAPES THE UI CONSUMES, emitted via
 * `pubsub.publishTickUpdate` and carried over SSE to the dashboard, the MCP
 * iframe cards, and the SDK client.
 *
 * The SDK's contract is the discriminated union below. The UI maps the
 * `(phase, status)` cross product to its 12 render states (pending, planning,
 * simulating, proposing, awaiting-approval, auto-approved, executing,
 * confirmed, attesting, attested, failed-simulation, failed-execution,
 * rejected-by-user). The MCP iframe card variant uses only a subset of the
 * fields — extra fields are ignored without error (forward-compat).
 */

/** Tick phases that participate in the in-loop orchestrator. Duplicated from
 * `@concierge-mantle/agent` to keep `shared` cycle-free (agent depends on
 * shared via the SDK; shared cannot depend on agent). The two lists must stay
 * in sync — see also `ORCHESTRATED_PHASES` in `@concierge-mantle/agent/types`. */
export type OrchestratedPhase = 'plan' | 'simulate' | 'propose' | 'execute' | 'record';

import type { Hex } from 'viem';

export type ISO8601 = string;

/** Severity ladder for risk flags surfaced by the simulator. */
export type RiskSeverity = 'info' | 'warn' | 'danger';

export interface RiskFlag {
  readonly severity: RiskSeverity;
  readonly message: string;
}

/** Dry-run output the UI's SimulationCard renders. */
export interface SimulationOutput {
  /** Signed decimal string, e.g. `"+12.34"` or `"-0.50"`. USD-denominated. */
  readonly expectedUsdDelta: string;
  /** Post-tx Aave health factor if the proposal touches Aave. */
  readonly healthFactorAfter?: string;
  readonly riskFlags: ReadonlyArray<RiskFlag>;
  /** Raw simulator output for the "Why?" expandable section. */
  readonly rawJson: unknown;
}

/**
 * Per-action proposal fields. Discriminated by Concierge action `kind` so the
 * UI's ProposalCard can render action-specific approval surfaces (Aave supply
 * shows asset+amount+APR, DEX swap shows token pair + slippage, etc.).
 *
 * The MCP iframe card variant treats this as opaque `{fields}` — it renders
 * whatever string keys are present and ignores the discriminant.
 */
export type ProposalFields =
  | {
      readonly kind: 'aave-supply';
      readonly asset: Hex;
      readonly amount: string;
      readonly expectedApr: string;
    }
  | {
      readonly kind: 'aave-borrow';
      readonly asset: Hex;
      readonly amount: string;
      readonly resultingHealthFactor: string;
    }
  | {
      readonly kind: 'dex-swap';
      readonly inputToken: Hex;
      readonly outputToken: Hex;
      readonly inputAmount: string;
      readonly minOutputAmount: string;
      readonly slippageBps: number;
    }
  | { readonly kind: 'ethena-stake'; readonly amount: string }
  | { readonly kind: 'ondo-mint'; readonly amount: string }
  | { readonly kind: 'meth-stake'; readonly amount: string }
  | {
      readonly kind: 'lifi-bridge';
      readonly fromChainId: number;
      readonly toChainId: number;
      readonly token: Hex;
      readonly amount: string;
    }
  | {
      readonly kind: 'erc8004-attest';
      /** Subject agent id of the attestation. Decimal string so the shape stays JSON-safe. */
      readonly subject: string;
      readonly payload: unknown;
    };

/**
 * The discriminated union emitted to the UI per phase change. SSE consumers
 * narrow on `.phase` to pick the right render variant.
 */
export type TickActionData =
  | { readonly phase: 'plan'; readonly reasoning: string }
  | { readonly phase: 'simulate'; readonly simulation: SimulationOutput }
  | {
      readonly phase: 'propose';
      readonly proposalId: string;
      readonly fields: ProposalFields;
    }
  | {
      readonly phase: 'execute';
      readonly userOpHash: Hex;
      readonly txHash?: Hex;
      readonly revertReason?: string;
    }
  | {
      readonly phase: 'record';
      readonly feedbackHash: Hex;
      readonly cid: string;
      readonly attestedAt: ISO8601;
    }
  | {
      readonly phase: 'decide';
      readonly outcome: 'auto-approved' | 'awaiting-user' | 'rejected';
      readonly approvedBy?: Hex;
      readonly approvalDeadline?: ISO8601;
    };

/** Envelope wrapping `TickActionData` for the publisher / SSE proxy. */
export interface TickUpdateEnvelope {
  readonly userId: string;
  readonly agentId: string;
  readonly tickId: string;
  readonly data: TickActionData;
  readonly at: ISO8601;
}

/** Quick sanity helper for SSE consumers narrowing back to OrchestratedPhase. */
export const ORCHESTRATED_PHASE_OF: Readonly<Record<TickActionData['phase'], OrchestratedPhase>> = {
  plan: 'plan',
  simulate: 'simulate',
  propose: 'propose',
  execute: 'execute',
  record: 'record',
  // `decide` is out-of-loop in the orchestrator; map to 'propose' for ordering.
  decide: 'propose',
};
