import type { LlmCallContext, Model, TickPhase } from './types.ts';

export const MODEL_SONNET: Model = 'claude-sonnet-4-6';
export const MODEL_OPUS: Model = 'claude-opus-4-7';
export const MODEL_HAIKU: Model = 'claude-haiku-4-5-20251001';

/**
 * Phase → Model routing.
 *
 *   plan     → Sonnet 4.6 (default reasoning depth)
 *   simulate → Sonnet 4.6 (deterministic on-chain pre-flight)
 *   propose  → Sonnet 4.6 (structured tool-call output)
 *   decide   → Sonnet 4.6  OR  Opus 4.7 when `ctx.riskFlagged`
 *              (governance moment — pay for deeper reasoning ONLY when the
 *              proposal tripped a risk threshold, otherwise cost dominates)
 *   execute  → Sonnet 4.6 (drives the bundler; no extra reasoning required)
 *   record   → Haiku 4.5  (cheap recap + attestation prep)
 *
 * Centralizing this in one function keeps tick-phase files from each
 * re-implementing model selection (which is how config drift happens). A
 * later A/B-test will live here too.
 */
export function routeModelForPhase(phase: TickPhase, ctx?: LlmCallContext): Model {
  switch (phase) {
    case 'plan':
    case 'simulate':
    case 'propose':
    case 'execute':
      return MODEL_SONNET;
    case 'decide':
      return ctx?.riskFlagged ? MODEL_OPUS : MODEL_SONNET;
    case 'record':
      return MODEL_HAIKU;
    default: {
      // Exhaustiveness — flags a new phase added without updating the route.
      const _never: never = phase;
      throw new Error(`[@concierge/llm] routeModelForPhase: unknown phase '${String(_never)}'.`);
    }
  }
}
