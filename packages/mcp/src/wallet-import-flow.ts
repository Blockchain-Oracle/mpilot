/**
 * Story-138 — Wallet / session-key import via URL-mode elicitation.
 *
 * The MCP user pastes their wallet (or signs a session-key delegation) on
 * `https://concierge.xyz/auth/import?token=<one-time>` rather than inside
 * the chat. The token is a 5-minute, single-use opaque string the server
 * mints; the iframe / browser page calls back to the Concierge API to
 * register the imported key. The MCP tool then polls the API until the key
 * appears (or times out).
 *
 * This module ships the MCP-side wiring only — the URL elicitation prompt
 * + the post-accept polling loop. Token minting + the import page itself
 * live in `apps/web/`; the polling endpoint lives in the Concierge API
 * service (out of scope for this story).
 */
import { ConciergeError } from '@concierge-mantle/sdk';
import {
  assertSafeUrl,
  type ElicitationCapability,
  type ElicitFn,
  requestUrlElicitation,
} from './elicitation.ts';

export interface ImportSessionKeyOpts {
  readonly elicit: ElicitFn;
  readonly capability: ElicitationCapability;
  /** Pre-minted, one-time, short-lived import token (5-min TTL recommended). */
  readonly oneTimeToken: string;
  /** Base URL for the import page; defaults to `https://concierge.xyz`. */
  readonly baseUrl?: string;
  /** Custom poll function — injected so tests don't hit the network. */
  readonly poll: PollFn;
  /** Max wall-clock seconds to wait for the poll to succeed (default 300). */
  readonly timeoutSeconds?: number;
  /** Optional custom prompt message (default produces sensible copy). */
  readonly message?: string;
  /** Cancellation channel; rejects polling on signal.aborted. */
  readonly signal?: AbortSignal;
}

export interface ImportedSessionKey {
  readonly sessionKeyAddress: `0x${string}`;
  readonly importedAt: string;
}

export type PollFn = (token: string) => Promise<ImportedSessionKey | null>;

const DEFAULT_BASE_URL = 'https://concierge.xyz';
const DEFAULT_TIMEOUT_SECONDS = 300;
const POLL_INTERVAL_MS = 2000;
/**
 * Max consecutive poll failures we tolerate before giving up — transient
 * network errors during the import window shouldn't abort the whole flow
 * (silent-failure C4 / code-reviewer I2). After this many in a row, we
 * surface the most recent error as a typed `RpcError`.
 */
const MAX_CONSECUTIVE_POLL_ERRORS = 5;

/**
 * Drive a URL-mode elicitation pointing at the Concierge import page, then
 * poll the API until the session key is registered or the timeout fires.
 *
 * Hardening (round-1 review):
 * - `baseUrl` is parsed + scheme-checked (https; loopback http allowed) so a
 *   misconfigured value can't leak the one-time token to a phishing host.
 * - `poll` errors are tolerated up to `MAX_CONSECUTIVE_POLL_ERRORS` in a row;
 *   the final throw wraps the last error in a typed `RpcError`.
 * - A FINAL `poll()` call fires AFTER the deadline elapses so a
 *   just-completed import isn't lost to the loop-exit race.
 * - `signal` propagates cancellation through the loop.
 * - Timeout exit throws `RpcError` (operational), not `ConfigError`.
 */
export async function importSessionKeyViaElicitation(
  opts: ImportSessionKeyOpts,
): Promise<ImportedSessionKey> {
  const base = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  // security review LOW (CWE-20): validate baseUrl scheme before embedding
  // the one-time token into a URL we hand to the host.
  assertSafeUrl(base, 'importSessionKeyViaElicitation: baseUrl');
  const url = `${base}/auth/import?token=${encodeURIComponent(opts.oneTimeToken)}`;

  if (opts.signal?.aborted) throwAborted();

  await requestUrlElicitation({
    elicit: opts.elicit,
    capability: opts.capability,
    url,
    message:
      opts.message ??
      'Import your Concierge session key by signing on concierge.xyz. We will pick it up automatically after you complete the flow in your browser.',
  });

  const timeoutSeconds = opts.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;
  const deadlineMs = Date.now() + timeoutSeconds * 1000;
  let consecutiveErrors = 0;
  let lastPollError: unknown;

  while (Date.now() < deadlineMs) {
    if (opts.signal?.aborted) throwAborted();
    try {
      const key = await opts.poll(opts.oneTimeToken);
      consecutiveErrors = 0;
      if (key) return key;
    } catch (err) {
      consecutiveErrors += 1;
      lastPollError = err;
      if (consecutiveErrors >= MAX_CONSECUTIVE_POLL_ERRORS) {
        throw new ConciergeError(
          'RpcError',
          `[@concierge-mantle/mcp] importSessionKey: aborted after ${consecutiveErrors} consecutive poll failures.`,
          err instanceof Error ? err : undefined,
          { consecutiveErrors },
        );
      }
    }
    await sleep(POLL_INTERVAL_MS, opts.signal);
  }

  // Final attempt AFTER the deadline so a just-completed import isn't lost
  // to the loop-exit race (silent-failure C4).
  try {
    const finalKey = await opts.poll(opts.oneTimeToken);
    if (finalKey) return finalKey;
  } catch (err) {
    lastPollError = err;
  }

  throw new ConciergeError(
    'RpcError',
    '[@concierge-mantle/mcp] importSessionKey: polling deadline exceeded before the import callback registered a session key. Re-run the flow.',
    lastPollError instanceof Error ? lastPollError : undefined,
    { timeoutSeconds, kind: 'timeout' },
  );
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(makeAbortError());
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(t);
      reject(makeAbortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function throwAborted(): never {
  throw new ConciergeError(
    'UserRejected',
    '[@concierge-mantle/mcp] importSessionKey: cancelled via AbortSignal before the import completed.',
    undefined,
    { action: 'aborted' },
  );
}

function makeAbortError(): Error {
  // Internal sentinel — consumed only inside this module's sleep wrapper.
  const e = new Error('aborted');
  e.name = 'AbortError';
  return e;
}
