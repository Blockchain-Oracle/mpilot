import { type DbClient, sessionKeys } from '@concierge/db';
import { ConciergeError } from '@concierge/sdk';
import { and, eq, isNull } from 'drizzle-orm';
import type { Address, Hex, LocalAccount } from 'viem';
import type { ConciergeAccount } from './types.ts';

/**
 * Optional event emitter the worker subscribes to via Redis pub/sub. Decoupled
 * from BullMQ directly — neither @concierge/smart-account nor @concierge/db
 * imports the worker layer.
 */
export interface RevocationEventEmitter {
  emit(
    event: 'agent.revoked',
    payload: { sessionKeyId: string; agentId: string; revokedAt: Date },
  ): void | Promise<void>;
}

/**
 * Submits the on-chain uninstall of the session-key validator. Caller supplies
 * the function — typically a thin wrapper around ZeroDev's `uninstallPlugin`
 * + the kernel client's UserOp pipeline. We pass it in instead of importing
 * the bundler stack so this module stays unit-testable without a live RPC.
 */
export type OnChainRevoker = (input: {
  conciergeAccount: ConciergeAccount;
  ownerAccount: LocalAccount;
  sessionKeyAddress: Address;
}) => Promise<{ txHash: Hex }>;

export interface RevokeSessionKeyConfig {
  readonly db: DbClient;
  readonly sessionKeyId: string;
  readonly ownerAccount: LocalAccount;
  readonly conciergeAccount: ConciergeAccount;
  readonly onChainRevoker: OnChainRevoker;
  readonly events?: RevocationEventEmitter;
  /** Retry count for the on-chain step. Default 1 (one retry after 5s). */
  readonly onChainRetries?: number;
  /** Backoff between on-chain retries (ms). Default 5000. */
  readonly onChainRetryBackoffMs?: number;
}

export interface RevokeSessionKeyResult {
  readonly sessionKeyId: string;
  readonly revokedAt: Date;
  readonly onChainTxHash: Hex;
}

const DEFAULT_RETRIES = 1;
const DEFAULT_BACKOFF_MS = 5_000;

/**
 * Three-step revocation, **DB first** for idempotence:
 *   1. UPDATE session_keys SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL
 *      → any subsequent loadSessionKey throws SessionKeyRevoked immediately,
 *      even before the on-chain tx confirms. Idempotent: re-revoking is a no-op.
 *   2. Submit on-chain uninstallValidator via owner-signed UserOp. Retries
 *      once on failure. If still failing, throws RevocationPartialFailure so the
 *      caller knows to retry the on-chain step (NOT to re-issue a key).
 *   3. Emit `agent.revoked` event for the worker to pause the cron queue.
 *      Emit failures are non-fatal — DB is authoritative; cron catches up.
 *
 * Audit log: caller's responsibility (this fn returns the data they need).
 */
export async function revokeSessionKey(
  config: RevokeSessionKeyConfig,
): Promise<RevokeSessionKeyResult> {
  // Step 1: DB revocation. Use a conditional UPDATE so a concurrent re-revoke
  // is a no-op and we return the row's actual revokedAt (idempotent).
  const updated = await config.db
    .update(sessionKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessionKeys.id, config.sessionKeyId), isNull(sessionKeys.revokedAt)))
    .returning({
      id: sessionKeys.id,
      revokedAt: sessionKeys.revokedAt,
      publicAddress: sessionKeys.publicAddress,
      agentId: sessionKeys.agentId,
    });
  let row = updated[0];
  if (!row) {
    // Either the row doesn't exist, or it's already revoked. Read to disambiguate.
    const existing = await config.db
      .select({
        id: sessionKeys.id,
        revokedAt: sessionKeys.revokedAt,
        publicAddress: sessionKeys.publicAddress,
        agentId: sessionKeys.agentId,
      })
      .from(sessionKeys)
      .where(eq(sessionKeys.id, config.sessionKeyId))
      .limit(1);
    const found = existing[0];
    if (!found) {
      throw new ConciergeError(
        'ConfigError',
        `[@concierge/smart-account] revokeSessionKey: session key '${config.sessionKeyId}' not found.`,
      );
    }
    // Already revoked — idempotent path.
    row = { ...found, revokedAt: found.revokedAt ?? new Date() };
  }
  if (row.revokedAt === null) {
    // Unreachable per the UPDATE setting it, but make the type system happy.
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/smart-account] revokeSessionKey: revokedAt unexpectedly null after UPDATE for '${config.sessionKeyId}'.`,
    );
  }
  const revokedAt = row.revokedAt;

  // Step 2: on-chain revocation with retry.
  const retries = config.onChainRetries ?? DEFAULT_RETRIES;
  const backoffMs = config.onChainRetryBackoffMs ?? DEFAULT_BACKOFF_MS;
  let lastErr: unknown;
  let txHash: Hex | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await config.onChainRevoker({
        conciergeAccount: config.conciergeAccount,
        ownerAccount: config.ownerAccount,
        sessionKeyAddress: row.publicAddress as Address,
      });
      txHash = result.txHash;
      break;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await sleep(backoffMs);
      }
    }
  }
  if (txHash === undefined) {
    throw new ConciergeError(
      'RevocationPartialFailure',
      `[@concierge/smart-account] revokeSessionKey: DB revoked at ${revokedAt.toISOString()}, but on-chain uninstall failed after ${retries + 1} attempt(s) for session key '${config.sessionKeyId}'. Caller MUST retry the on-chain step — do NOT re-issue a key.`,
      lastErr,
      { sessionKeyId: config.sessionKeyId, dbRevoked: true, onChainRevoked: false },
    );
  }

  // Step 3: emit event for the worker. Failures are non-fatal — log + continue.
  if (config.events) {
    try {
      await config.events.emit('agent.revoked', {
        sessionKeyId: config.sessionKeyId,
        agentId: row.agentId,
        revokedAt,
      });
    } catch {
      // Non-fatal per spec: DB is authoritative; the worker pauses on tick
      // re-fire if it can't get the event in real time. We do NOT rethrow.
    }
  }

  return { sessionKeyId: config.sessionKeyId, revokedAt, onChainTxHash: txHash };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
