/**
 * Tick-loop phases per `research/concierge/04-agent-runtime.md` § 2.1. The
 * `as const` tuple is the single source of truth — the `TickPhase` union is
 * derived from it so adding a phase requires only one edit (and trips the
 * `_never` exhaustiveness in `routeModelForPhase` at compile time).
 */
export const TICK_PHASES = ['plan', 'simulate', 'propose', 'decide', 'execute', 'record'] as const;

export type TickPhase = (typeof TICK_PHASES)[number];

/**
 * Runtime narrower for plain-JS callers + boundary validation in TS callers
 * that accept untyped input (env vars, deserialized config). Pairs with the
 * compile-time `TickPhase` union — together they close the "typo lands as a
 * runtime error far from the call site" hole.
 */
export function isTickPhase(value: unknown): value is TickPhase {
  return typeof value === 'string' && (TICK_PHASES as readonly string[]).includes(value);
}

/**
 * Model identifiers per ADR-006 + the system-declared model family
 * (currentDate 2026-06-13):
 *   - Sonnet 4.6 — default for plan/simulate/propose/execute
 *   - Opus 4.7   — used only for `decide` when the route flags risk
 *   - Haiku 4.5  — used for `record` (cheap, fast tick wrap-up)
 *
 * Sonnet and Opus are UNDATED per the system prompt's authoritative
 * declaration; Haiku carries its release date. Mixed shape is intentional
 * and matches what Anthropic's API accepts for this model family.
 */
export const MODELS = [
  'claude-sonnet-4-6',
  'claude-opus-4-7',
  'claude-haiku-4-5-20251001',
] as const;

export type Model = (typeof MODELS)[number];

export function isModel(value: unknown): value is Model {
  return typeof value === 'string' && (MODELS as readonly string[]).includes(value);
}

/**
 * Boundary parser. Use at every untrusted input edge (env var, deserialized
 * config, AI_MODEL override) so the SDK never sends an opaque string to
 * Anthropic and round-trips a `400 invalid_model_id` minutes later.
 */
export function assertModel(value: unknown): Model {
  if (!isModel(value)) {
    throw new Error(
      `[@concierge/llm] assertModel: '${String(value)}' is not a known model. Expected one of: ${MODELS.join(', ')}.`,
    );
  }
  return value;
}

/**
 * Per-call routing context. `riskFlagged === true` is the only condition
 * that escalates `decide` to Opus — we deliberately check `=== true` (not
 * truthiness) so a future widening to `boolean | 'unknown'` doesn't silently
 * route every uncertain call to the expensive model.
 */
export interface LlmCallContext {
  readonly riskFlagged?: boolean;
}
