/**
 * Production state loader. Story-62 ships the SHAPE and DI contract; the
 * concrete Postgres SELECTs land alongside the agent/tick/policy schema
 * consumers (story-69's tables are already created; this is the read side).
 *
 * For now, we export the loader signature + a clear error if a caller uses
 * the placeholder before the real implementation lands. This keeps the
 * tick orchestrator unit-testable today (callers inject their own loader)
 * without shipping a half-built SELECT that would silently 0-result.
 */
import { ConciergeError } from '@concierge/sdk';
import type { AgentState } from './types.ts';

export async function loadAgentState(_agentId: string): Promise<AgentState> {
  throw new ConciergeError(
    'ConfigError',
    `[@concierge/runtime] loadAgentState: not implemented in story-62 — inject a custom loader via TickConfig.loadState. Concrete Postgres SELECT lands in a follow-up story.`,
  );
}
