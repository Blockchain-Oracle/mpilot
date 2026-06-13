/**
 * Tick-loop phases per `research/concierge/04-agent-runtime.md` § 2.1. Each
 * phase has a characteristic reasoning profile (planning depth, latency
 * budget, error tolerance) that drives model selection in `routeModelForPhase`.
 */
export type TickPhase = 'plan' | 'simulate' | 'propose' | 'decide' | 'execute' | 'record';

export const TICK_PHASES: readonly TickPhase[] = Object.freeze([
  'plan',
  'simulate',
  'propose',
  'decide',
  'execute',
  'record',
]);

/**
 * Model identifiers exported as a discriminated union over the concrete
 * Anthropic model IDs. Per ADR-006 amended (memory[currentDate] 2026-06-13):
 *   - Sonnet 4.6 — default for plan/simulate/propose/execute
 *   - Opus 4.7   — used only for `decide` phase when the route flags risk
 *   - Haiku 4.5  — used for `record` phase (cheap, fast tick wrap-up)
 *
 * The string literals MUST exactly match Anthropic's published model IDs
 * — the SDK does no remapping, so a typo lands as a 400 invalid_model_id
 * at first network call, not at deploy time.
 */
export type Model = 'claude-sonnet-4-6' | 'claude-opus-4-7' | 'claude-haiku-4-5-20251001';

/**
 * Per-call context handed to `routeModelForPhase`. Currently the only
 * route-altering signal is `riskFlagged` (escalates the `decide` phase from
 * Sonnet → Opus). Extra fields can be added without breaking the routing
 * contract — defaults stay the same.
 */
export interface LlmCallContext {
  /**
   * When true and the phase is `decide`, the route returns Opus 4.7 instead
   * of Sonnet 4.6. Upstream sets this when the planner's proposal trips a
   * risk threshold (e.g. position size > Y% of portfolio, novel protocol).
   */
  readonly riskFlagged?: boolean;
}

/**
 * Normalized return shape across the wrapped SDK calls. Anthropic returns
 * `usage` at the top level of a Message; we surface the prompt-caching
 * counters explicitly because cache-hit visibility is the whole point of
 * the stable-prefix helpers in `cache.ts`.
 */
export interface CompletionResult {
  readonly model: Model;
  readonly textOut: string;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheCreationInputTokens: number;
    readonly cacheReadInputTokens: number;
  };
}
