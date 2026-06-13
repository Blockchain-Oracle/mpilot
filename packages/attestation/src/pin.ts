import { ConciergeError } from '@concierge/sdk';
import { computeFeedbackPair } from './hash.ts';
import type { PinService, PinServiceName } from './pinService.ts';
import type { FeedbackEnvelope } from './schema.ts';

const NEVER_ABORT = new AbortController().signal;

export interface PinAttempt {
  readonly service: PinServiceName;
  readonly ok: boolean;
  readonly cid?: string;
  readonly pinId?: string;
  readonly error?: string;
}

/**
 * Outcome of pinFeedback. `cid` is the final returned CID — Pinata's if it
 * succeeded, otherwise web3.storage's. Both attempts are reported so the
 * caller can persist receipts AND surface partial-redundancy state.
 *
 * **Both services run on the happy path** for redundancy per ADR-004 +
 * story-81 BDD. If only one is available (missing JWT / token), the other
 * still runs alone and `fallback.ok` reflects "service not configured."
 */
export interface PinFeedbackResult {
  readonly cid: string;
  readonly canonical: string;
  readonly hash: `0x${string}`;
  readonly primary: PinAttempt;
  readonly fallback: PinAttempt;
}

export interface PinFeedbackDeps {
  /** Pinata adapter (createPinataPinService). Optional → caller skipped Pinata config. */
  readonly primary?: PinService;
  /** web3.storage adapter (createWeb3StoragePinService). Optional → caller skipped. */
  readonly fallback?: PinService;
  readonly logger?: {
    warn(meta: Record<string, unknown>, msg: string): void;
    error(meta: Record<string, unknown>, msg: string): void;
  };
  readonly signal?: AbortSignal;
}

/**
 * Canonicalize → keccak256 → pin to Pinata + web3.storage (redundant).
 *
 * Failure matrix:
 *   - both configured + both succeed → returns Pinata's CID (primary wins)
 *   - both configured + Pinata fails → returns web3.storage's CID; primary.ok=false
 *   - both configured + BOTH fail → throws ConciergeError('IPFSPinFailed', ...)
 *   - only Pinata configured + succeeds → returns Pinata's CID; fallback marked "not configured"
 *   - only web3.storage configured + succeeds → returns web3.storage's CID
 *   - NEITHER configured → throws ConciergeError('ConfigError', ...) at the boundary
 */
export async function pinFeedback(
  envelope: FeedbackEnvelope,
  deps: PinFeedbackDeps,
): Promise<PinFeedbackResult> {
  if (deps.primary === undefined && deps.fallback === undefined) {
    throw new ConciergeError(
      'ConfigError',
      '[@concierge/attestation] pinFeedback: at least one of `primary` or `fallback` PinService must be configured.',
    );
  }

  // Hash + canonicalize ONCE — pair from story-82 round-2. The canonical
  // string is what gets uploaded; `hash === keccak256(toBytes(canonical))`
  // is provable by construction so the on-chain dataHash matches the
  // pinned content byte-for-byte.
  const { hash, canonical } = computeFeedbackPair(envelope);
  const displayName = `concierge-${envelope.agentId}-${envelope.schema}`;
  const signal = deps.signal ?? NEVER_ABORT;

  // Run BOTH in parallel for redundancy. The CID is content-addressed,
  // so both services will return the SAME CID for the same canonical
  // bytes — we use Pinata's as the canonical answer when available.
  const [primaryRes, fallbackRes] = await Promise.allSettled([
    deps.primary?.pin({ canonical, displayName, signal }) ?? Promise.reject(notConfigured()),
    deps.fallback?.pin({ canonical, displayName, signal }) ?? Promise.reject(notConfigured()),
  ]);

  const primary = toAttempt('pinata', primaryRes, deps.primary !== undefined);
  const fallback = toAttempt('web3.storage', fallbackRes, deps.fallback !== undefined);

  if (!primary.ok && !fallback.ok) {
    deps.logger?.error(
      { agentId: envelope.agentId, hash, primary: primary.error, fallback: fallback.error },
      'pinFeedback: both services failed',
    );
    throw new ConciergeError(
      'IPFSPinFailed',
      `[@concierge/attestation] pinFeedback: BOTH services failed. primary=${primary.error ?? 'n/a'} | fallback=${fallback.error ?? 'n/a'}`,
      undefined,
      { hash, agentId: envelope.agentId, primary, fallback },
    );
  }
  // Primary wins if available; otherwise fallback's CID is the answer.
  const cid = primary.cid ?? fallback.cid;
  if (cid === undefined) {
    // Defensive — should be unreachable given the (!primary.ok && !fallback.ok) guard.
    throw new ConciergeError(
      'IPFSPinFailed',
      `[@concierge/attestation] pinFeedback: no CID despite at least one service reporting ok=true. Invariant violated.`,
    );
  }
  if (!primary.ok) {
    deps.logger?.warn(
      { agentId: envelope.agentId, hash, primaryError: primary.error, cid },
      'pinFeedback: primary (Pinata) failed; web3.storage fallback succeeded',
    );
  }
  return { cid, canonical, hash, primary, fallback };
}

function notConfigured(): Error {
  return new Error('not configured');
}

function toAttempt(
  service: PinServiceName,
  res: PromiseSettledResult<{ readonly cid: string; readonly pinId: string }>,
  configured: boolean,
): PinAttempt {
  if (!configured) {
    return { service, ok: false, error: 'not configured' };
  }
  if (res.status === 'fulfilled') {
    return { service, ok: true, cid: res.value.cid, pinId: res.value.pinId };
  }
  const errMsg = res.reason instanceof Error ? res.reason.message : String(res.reason);
  return { service, ok: false, error: errMsg.slice(0, 512) };
}
