import { type DbClient, sessionKeys } from '@concierge/db';
import { ConciergeError } from '@concierge/sdk';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type {
  OnChainRevoker,
  RevocationEventEmitter,
  RevokeSessionKeyResult,
} from './revokeSessionKey.ts';
import { revokeSessionKey } from './revokeSessionKey.ts';

const uuidSchema = z.string().uuid();

export interface EmergencyStopConfig {
  readonly db: DbClient;
  readonly agentId: string;
  readonly onChainRevoker: OnChainRevoker;
  readonly events?: RevocationEventEmitter;
}

export type PartialFailure = ConciergeError & { type: 'RevocationPartialFailure' };

export interface EmergencyStopResult {
  /** Per-key successes. `length === revokedCount`. */
  readonly revoked: readonly RevokeSessionKeyResult[];
  /** DB succeeded, on-chain failed — caller must retry the on-chain step. */
  readonly partialFailures: readonly { sessionKeyId: string; cause: PartialFailure }[];
  /**
   * Anything else (e.g. race delete, transient DB error). Surfaced rather than
   * thrown so a single bad key never aborts an in-progress emergency stop.
   */
  readonly unexpectedFailures: readonly { sessionKeyId: string; cause: unknown }[];
}

/**
 * Revokes ALL active session keys for an agent. Idempotent: returns empty
 * arrays when no active keys exist (NOT a throw).
 *
 * Failure isolation: per-key failures (partial-failure OR unexpected) go to
 * separate result buckets. The function NEVER throws on a per-key error,
 * because emergency-stop semantics require best-effort coverage of the fleet
 * — exactly when something is going wrong is the worst time to abort.
 */
export async function emergencyStop(config: EmergencyStopConfig): Promise<EmergencyStopResult> {
  if (!uuidSchema.safeParse(config.agentId).success) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/smart-account] emergencyStop: agentId is not a valid UUID.`,
    );
  }

  const active = await config.db
    .select({ id: sessionKeys.id })
    .from(sessionKeys)
    .where(and(eq(sessionKeys.agentId, config.agentId), isNull(sessionKeys.revokedAt)));
  if (active.length === 0) {
    return { revoked: [], partialFailures: [], unexpectedFailures: [] };
  }

  const settled = await Promise.allSettled(
    active.map(({ id }) =>
      revokeSessionKey({
        db: config.db,
        sessionKeyId: id,
        expectedAgentId: config.agentId,
        onChainRevoker: config.onChainRevoker,
        ...(config.events !== undefined && { events: config.events }),
      }),
    ),
  );

  const revoked: RevokeSessionKeyResult[] = [];
  const partialFailures: { sessionKeyId: string; cause: PartialFailure }[] = [];
  const unexpectedFailures: { sessionKeyId: string; cause: unknown }[] = [];
  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    const id = active[i]?.id ?? '<unknown>';
    if (!outcome) continue;
    if (outcome.status === 'fulfilled') {
      revoked.push(outcome.value);
    } else if (
      outcome.reason instanceof ConciergeError &&
      outcome.reason.type === 'RevocationPartialFailure'
    ) {
      partialFailures.push({ sessionKeyId: id, cause: outcome.reason as PartialFailure });
    } else {
      unexpectedFailures.push({ sessionKeyId: id, cause: outcome.reason });
    }
  }
  return { revoked, partialFailures, unexpectedFailures };
}
