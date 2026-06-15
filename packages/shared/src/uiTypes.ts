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
import { z } from 'zod';

export type ISO8601 = string;

/** Runtime guard for hex32 (tx hash, feedback hash, etc.). */
const HEX32 = /^0x[0-9a-fA-F]{64}$/;
const ADDR = /^0x[0-9a-fA-F]{40}$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;

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

/**
 * Runtime-validated schemas for `TickActionData` + `TickUpdateEnvelope`. Pub/sub
 * crosses an untrusted boundary (Redis is shared infra; a compromised publisher
 * could emit anything). Subscribers MUST `safeParse` envelopes before routing
 * to the UI — a `JSON.parse(...) as TickUpdateEnvelope` cast is a silent-failure
 * trap (malformed payloads would render as undefined-narrowed switches).
 */
/**
 * Minimal structural validator type. `rollup-plugin-dts` (tsup's .d.ts
 * generator) bundles each package's types in isolation and cannot resolve
 * `z.ZodType` across the bundled zod dependency — it degrades the annotation
 * to `undefined`, making the export unusable for consumers. Annotating with a
 * LOCAL interface sidesteps this entirely. Zod schemas satisfy it via
 * covariant return types, so no cast is needed at the definition site.
 */
export interface RuntimeValidator {
  safeParse(data: unknown): { success: true; data: unknown } | { success: false; error: unknown };
  parse(data: unknown): unknown;
}

const hex32 = z.string().regex(HEX32);
const addr = z.string().regex(ADDR);

const riskFlagSchema = z.object({
  severity: z.enum(['info', 'warn', 'danger']),
  message: z.string().max(2048),
});

const simulationOutputSchema = z.object({
  expectedUsdDelta: z.string().max(64),
  healthFactorAfter: z.string().max(64).optional(),
  riskFlags: z.array(riskFlagSchema).max(32),
  rawJson: z.unknown(),
});

const proposalFieldsSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('aave-supply'),
    asset: addr,
    amount: z.string(),
    expectedApr: z.string(),
  }),
  z.object({
    kind: z.literal('aave-borrow'),
    asset: addr,
    amount: z.string(),
    resultingHealthFactor: z.string(),
  }),
  z.object({
    kind: z.literal('dex-swap'),
    inputToken: addr,
    outputToken: addr,
    inputAmount: z.string(),
    minOutputAmount: z.string(),
    slippageBps: z.number().int().min(0).max(10_000),
  }),
  z.object({ kind: z.literal('ethena-stake'), amount: z.string() }),
  z.object({ kind: z.literal('ondo-mint'), amount: z.string() }),
  z.object({ kind: z.literal('meth-stake'), amount: z.string() }),
  z.object({
    kind: z.literal('lifi-bridge'),
    fromChainId: z.number().int().positive(),
    toChainId: z.number().int().positive(),
    token: addr,
    amount: z.string(),
  }),
  z.object({
    kind: z.literal('erc8004-attest'),
    subject: z.string(),
    payload: z.unknown(),
  }),
]);

// Annotated with the local `RuntimeValidator` interface (see above) so tsup's
// DTS pipeline emits a usable declaration. Without an explicit annotation it
// emits `declare const tickActionDataSchema: undefined` (the nested
// discriminatedUnion's inferred type is too complex for rollup-plugin-dts), and
// `z.ZodType` / `z.ZodTypeAny` don't resolve across the bundled zod dep either.
export const tickActionDataSchema: RuntimeValidator = z.discriminatedUnion('phase', [
  z.object({ phase: z.literal('plan'), reasoning: z.string().max(16_384) }),
  z.object({ phase: z.literal('simulate'), simulation: simulationOutputSchema }),
  z.object({
    phase: z.literal('propose'),
    proposalId: z.string().max(128),
    fields: proposalFieldsSchema,
  }),
  z.object({
    phase: z.literal('execute'),
    userOpHash: hex32,
    txHash: hex32.optional(),
    revertReason: z.string().max(2048).optional(),
  }),
  z.object({
    phase: z.literal('record'),
    feedbackHash: hex32,
    cid: z
      .string()
      .regex(/^[A-Za-z0-9]+$/)
      .max(128),
    attestedAt: z.string().max(64),
  }),
  z.object({
    phase: z.literal('decide'),
    outcome: z.enum(['auto-approved', 'awaiting-user', 'rejected']),
    approvedBy: addr.optional(),
    approvalDeadline: z.string().max(64).optional(),
  }),
]);
// We can't `satisfies z.ZodType<TickActionData>` here: Zod 4 widens optional /
// readonly properties relative to the manual interface, so the constraint
// rejects a structurally-correct schema. The schemas validate the right shape
// at runtime (covered by pubsub tests); the manual interface remains the
// public TS contract.

export const tickUpdateEnvelopeSchema: RuntimeValidator = z.object({
  userId: z.string().regex(ID),
  agentId: z.string().regex(ID),
  tickId: z.string().max(128),
  data: tickActionDataSchema,
  at: z.string().max(64),
});

/**
 * Map UI-emitted `TickActionData.phase` to the in-loop `OrchestratedPhase`.
 *
 * **Lossy** for `'decide'`, which is out-of-loop in the orchestrator. We pin
 * it to `'propose'` for ordering purposes only — consumers that need the
 * actual ledger key for phase accounting (ADR-014) MUST handle `'decide'`
 * separately rather than reading from this map. The name is deliberately
 * verbose so the lossiness is impossible to miss at the call site.
 */
export const TICK_PHASE_TO_ORCHESTRATED_PHASE: Readonly<
  Record<TickActionData['phase'], OrchestratedPhase>
> = {
  plan: 'plan',
  simulate: 'simulate',
  propose: 'propose',
  execute: 'execute',
  record: 'record',
  decide: 'propose',
};

/** @deprecated use `TICK_PHASE_TO_ORCHESTRATED_PHASE` — name made the lossy `decide` mapping invisible. */
export const ORCHESTRATED_PHASE_OF = TICK_PHASE_TO_ORCHESTRATED_PHASE;
