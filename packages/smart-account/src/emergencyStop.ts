import { type DbClient, sessionKeys } from '@concierge/db';
import { ConciergeError } from '@concierge/sdk';
import { and, eq, isNull } from 'drizzle-orm';
import type { LocalAccount } from 'viem';
import type {
  OnChainRevoker,
  RevocationEventEmitter,
  RevokeSessionKeyResult,
} from './revokeSessionKey.ts';
import { revokeSessionKey } from './revokeSessionKey.ts';
import type { ConciergeAccount } from './types.ts';

export interface EmergencyStopConfig {
  readonly db: DbClient;
  readonly agentId: string;
  readonly ownerAccount: LocalAccount;
  readonly conciergeAccount: ConciergeAccount;
  readonly onChainRevoker: OnChainRevoker;
  readonly events?: RevocationEventEmitter;
}

export interface EmergencyStopResult {
  readonly ok: true;
  readonly revokedCount: number;
  /** Per-key results — empty when no active keys (idempotent no-op). */
  readonly revoked: readonly RevokeSessionKeyResult[];
  /** Sessions where DB succeeded but on-chain failed — caller must retry these. */
  readonly partialFailures: readonly { sessionKeyId: string; cause: unknown }[];
}

/**
 * Revokes ALL active session keys for an agent. Idempotent: returns
 * `{ ok: true, revokedCount: 0 }` if the agent has no active keys (NOT a throw).
 *
 * Partial-failure isolation: each key's on-chain step is independent — one
 * failure does NOT block the others. The result carries per-key partial
 * failures so the caller can surface them in the UI.
 *
 * On total success, the agent's BullMQ queue is paused via the `agent.revoked`
 * event (one event per key — the worker dedupes by agentId).
 */
export async function emergencyStop(config: EmergencyStopConfig): Promise<EmergencyStopResult> {
  // Select active session keys (not yet revoked) for this agent.
  const active = await config.db
    .select({ id: sessionKeys.id })
    .from(sessionKeys)
    .where(and(eq(sessionKeys.agentId, config.agentId), isNull(sessionKeys.revokedAt)));
  if (active.length === 0) {
    return { ok: true, revokedCount: 0, revoked: [], partialFailures: [] };
  }
  const revoked: RevokeSessionKeyResult[] = [];
  const partialFailures: { sessionKeyId: string; cause: unknown }[] = [];
  for (const { id } of active) {
    try {
      const result = await revokeSessionKey({
        db: config.db,
        sessionKeyId: id,
        ownerAccount: config.ownerAccount,
        conciergeAccount: config.conciergeAccount,
        onChainRevoker: config.onChainRevoker,
        ...(config.events !== undefined && { events: config.events }),
      });
      revoked.push(result);
    } catch (err) {
      if (err instanceof ConciergeError && err.type === 'RevocationPartialFailure') {
        partialFailures.push({ sessionKeyId: id, cause: err });
      } else {
        // Anything else (not-found, ConfigError) is genuinely unexpected — rethrow.
        throw err;
      }
    }
  }
  return { ok: true, revokedCount: revoked.length, revoked, partialFailures };
}
