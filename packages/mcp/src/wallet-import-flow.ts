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
import { type ElicitationCapability, type ElicitFn, requestUrlElicitation } from './elicitation.ts';

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
 * Drive a URL-mode elicitation pointing at the Concierge import page, then
 * poll the API until the session key is registered or the timeout fires.
 */
export async function importSessionKeyViaElicitation(
  opts: ImportSessionKeyOpts,
): Promise<ImportedSessionKey> {
  const base = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  // URI-encode for safety; tokens are opaque but defensive coding wins here.
  const url = `${base}/auth/import?token=${encodeURIComponent(opts.oneTimeToken)}`;

  await requestUrlElicitation({
    elicit: opts.elicit,
    capability: opts.capability,
    url,
    message:
      opts.message ??
      'Import your Concierge session key by signing on concierge.xyz. We will pick it up automatically after you complete the flow in your browser.',
  });

  const deadlineMs = Date.now() + (opts.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS) * 1000;
  while (Date.now() < deadlineMs) {
    const key = await opts.poll(opts.oneTimeToken);
    if (key) return key;
    await sleep(POLL_INTERVAL_MS);
  }
  throw new ConciergeError(
    'ConfigError',
    '[@concierge-mantle/mcp] importSessionKey: polling deadline exceeded before the import callback registered a session key. Re-run the flow.',
    undefined,
    { timeoutSeconds: opts.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS },
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
