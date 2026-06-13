import type { LlmCallContext, Model, TickPhase } from './types.ts';

export const MODEL_SONNET: Model = 'claude-sonnet-4-6';
export const MODEL_OPUS: Model = 'claude-opus-4-7';
export const MODEL_HAIKU: Model = 'claude-haiku-4-5-20251001';

/**
 * Static phase → default-model table. Decoupling the lookup from the
 * imperative switch makes the routing contract testable directly and lets
 * the exhaustiveness reviewer answer "what did I forget?" by reading data
 * rather than control flow.
 *
 * NOTE: `decide` keeps Sonnet as the BASE — `routeModelForPhase` escalates
 * to Opus only when `ctx.riskFlagged === true`. Centralising the table here
 * means the per-call escalation logic stays in one function (no scattered
 * `if`s in tick phases that would drift over time).
 */
export const DEFAULT_MODEL_BY_PHASE: Readonly<Record<TickPhase, Model>> = Object.freeze({
  plan: MODEL_SONNET,
  simulate: MODEL_SONNET,
  propose: MODEL_SONNET,
  decide: MODEL_SONNET,
  execute: MODEL_SONNET,
  record: MODEL_HAIKU,
});

/**
 * Phase → Model routing. `decide` escalates to Opus 4.7 ONLY when
 * `ctx.riskFlagged === true` (explicit `=== true` so a future widening to
 * `boolean | 'unknown'` cannot silently route every uncertain call to the
 * expensive model). All other phases route per `DEFAULT_MODEL_BY_PHASE`.
 *
 * Defensive runtime throw on unknown phase — plain-JS callers bypassing the
 * TickPhase compile-time guarantee get a loud ConfigError, not an opaque
 * Anthropic 400 minutes later.
 */
export function routeModelForPhase(phase: TickPhase, ctx?: LlmCallContext): Model {
  const base = DEFAULT_MODEL_BY_PHASE[phase];
  if (!base) {
    throw new Error(`[@concierge/llm] routeModelForPhase: unknown phase '${String(phase)}'.`);
  }
  if (phase === 'decide' && ctx?.riskFlagged === true) {
    return MODEL_OPUS;
  }
  return base;
}
