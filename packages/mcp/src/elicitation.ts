/**
 * Story-138 — MCP Elicitation (Rail 3 / ADR-017): form-mode confirmation +
 * url-mode handoff. Wraps the SDK 1.29 `Server.elicitInput()` API in two
 * Concierge-shaped helpers:
 *
 * 1. `requestFormConfirmation` — high-value action gate. When the notional
 *    USD value of a write action exceeds the configurable threshold (env
 *    `CONCIERGE_CONFIRM_THRESHOLD_USD`, default $1000), the helper builds
 *    a structured JSON-schema form (confirm/maxSlippageBps/justification)
 *    and routes it through the MCP host's elicitation surface. Returns the
 *    user-confirmed values on accept; throws typed `UserRejected` on
 *    decline / cancel / "accept-but-unchecked".
 *
 * 2. `requestUrlElicitation` — SEP-1036 URL handoff. Used for wallet-connect
 *    / OAuth / Concierge auth flows where the user must complete an action
 *    in their browser. Returns when the host signals `accept`; throws
 *    `UserRejected` on cancel/decline.
 *
 * Both helpers are pure functions over injected dependencies (`elicit` +
 * `capability`) so they're testable without instantiating an `McpServer`.
 * `server.ts` provides the production wiring via `buildElicitationDeps(server)`.
 */
import { ConciergeError } from '@concierge-mantle/sdk';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ElicitRequest, ElicitResult } from '@modelcontextprotocol/sdk/types.js';

export type ElicitParams = ElicitRequest['params'];
export type ElicitFn = (params: ElicitParams) => Promise<ElicitResult>;

export interface ElicitationCapability {
  /**
   * True iff the connected MCP client advertised the `elicitation` capability
   * during the `initialize` handshake. Hosts that DON'T support elicitation
   * (older Claude Desktop builds, some IDE clients) MUST get a fallback path
   * instead of an `elicitInput` call (the SDK would throw a
   * "client does not support elicitation" error).
   */
  readonly supported: boolean;
}

/** Default high-value threshold (USD) above which confirmation is required. */
export const DEFAULT_HIGH_VALUE_USD = 1000;

const THRESHOLD_ENV_VAR = 'CONCIERGE_CONFIRM_THRESHOLD_USD';

/**
 * Read the configured high-value threshold from env or fall back to default.
 * Anti-regression marker required by `story-138-mcp-elicitation.md`'s
 * shell-verification (grep for env var name).
 */
export function readHighValueThresholdUsd(env?: NodeJS.ProcessEnv): number {
  const source = env ?? process.env;
  const raw = source[THRESHOLD_ENV_VAR];
  if (raw === undefined || raw === '') return DEFAULT_HIGH_VALUE_USD;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge-mantle/mcp] elicitation: ${THRESHOLD_ENV_VAR} must be a non-negative finite number; got '${raw}'`,
    );
  }
  return n;
}

export interface FormConfirmationOpts {
  readonly elicit: ElicitFn;
  readonly capability: ElicitationCapability;
  /** One-line summary the user sees in the form prompt. */
  readonly actionSummary: string;
  /** USD value the action is about to move. Drives threshold gating. */
  readonly notionalUsd: number;
  /** Optional explicit override; defaults to env / `DEFAULT_HIGH_VALUE_USD`. */
  readonly threshold?: number;
  /** Slippage default pre-filled into the form (basis points). */
  readonly defaultMaxSlippageBps?: number;
}

export interface FormConfirmationResult {
  readonly confirmed: true;
  /** User's chosen max slippage in basis points (0..1000). */
  readonly maxSlippageBps: number;
  /** Optional audit-log justification the user entered (≤200 chars). */
  readonly justification?: string;
  /** True iff the form was actually shown; false iff below-threshold no-op. */
  readonly elicited: boolean;
}

/**
 * Gate a high-value write action behind a structured form-mode elicitation.
 *
 * Behaviour matrix:
 *   notionalUsd ≤ threshold          → returns `{elicited: false, ...defaults}` (no prompt)
 *   notional > threshold, no cap     → throws `ConfigError` (caller must LLM-fallback)
 *   notional > threshold, supported  → prompts; routes accept/decline/cancel
 */
export async function requestFormConfirmation(
  opts: FormConfirmationOpts,
): Promise<FormConfirmationResult> {
  const threshold = opts.threshold ?? readHighValueThresholdUsd();
  const defaultSlippage = opts.defaultMaxSlippageBps ?? 50;

  if (opts.notionalUsd <= threshold) {
    return { confirmed: true, maxSlippageBps: defaultSlippage, elicited: false };
  }

  if (!opts.capability.supported) {
    // Caller must surface a fallback in the tool result (e.g., return a
    // structured-content payload asking the LLM to confirm in chat). Throwing
    // a typed ConfigError makes the missed-capability state programmatically
    // distinguishable from a real elicitation failure.
    throw new ConciergeError(
      'ConfigError',
      `[@concierge-mantle/mcp] elicitation: high-value action ($${opts.notionalUsd.toFixed(2)}) requires structured confirmation, but the client did not advertise the 'elicitation' capability. Surface an LLM-readable confirmation prompt instead.`,
      undefined,
      { capability: 'missing', notionalUsd: opts.notionalUsd, threshold },
    );
  }

  const params: ElicitParams = {
    mode: 'form',
    message: `Confirm: ${opts.actionSummary}\nNotional: $${opts.notionalUsd.toFixed(2)}`,
    requestedSchema: {
      type: 'object',
      properties: {
        confirm: { type: 'boolean', title: 'Approve?' },
        maxSlippageBps: {
          type: 'number',
          title: 'Max slippage (basis points)',
          minimum: 0,
          maximum: 1000,
          default: defaultSlippage,
        },
        justification: {
          type: 'string',
          title: 'Justification (audit log)',
          maxLength: 200,
        },
      },
      required: ['confirm'],
    },
  };

  const result = await opts.elicit(params);

  if (result.action === 'cancel') {
    throw new ConciergeError(
      'UserRejected',
      '[@concierge-mantle/mcp] elicitation: user cancelled the confirmation.',
      undefined,
      { action: 'cancel' },
    );
  }
  if (result.action === 'decline') {
    throw new ConciergeError(
      'UserRejected',
      '[@concierge-mantle/mcp] elicitation: user declined the action.',
      undefined,
      { action: 'decline' },
    );
  }
  if (result.action !== 'accept') {
    throw new ConciergeError(
      'RpcError',
      `[@concierge-mantle/mcp] elicitation: unexpected action value '${String(result.action).replace(/[^A-Za-z0-9_-]/g, '')}' from client.`,
    );
  }

  const content = result.content ?? {};
  if (content['confirm'] !== true) {
    throw new ConciergeError(
      'UserRejected',
      '[@concierge-mantle/mcp] elicitation: user submitted the form without checking the confirm box.',
      undefined,
      { action: 'accept-no-confirm' },
    );
  }
  const slippage =
    typeof content['maxSlippageBps'] === 'number' ? content['maxSlippageBps'] : defaultSlippage;
  const justification =
    typeof content['justification'] === 'string' ? content['justification'] : undefined;
  return {
    confirmed: true,
    maxSlippageBps: slippage,
    elicited: true,
    ...(justification !== undefined ? { justification } : {}),
  };
}

export interface UrlElicitationOpts {
  readonly elicit: ElicitFn;
  readonly capability: ElicitationCapability;
  readonly url: string;
  readonly message: string;
  /** Optional explicit id; defaults to a random UUID. SEP-1036. */
  readonly elicitationId?: string;
}

/**
 * SEP-1036 url-mode elicitation. Points the user to a URL (wallet-connect,
 * OAuth, Concierge auth handoff) and waits for the host to signal that the
 * user completed the flow there. Throws `UserRejected` on cancel/decline.
 */
export async function requestUrlElicitation(opts: UrlElicitationOpts): Promise<void> {
  if (!opts.capability.supported) {
    throw new ConciergeError(
      'ConfigError',
      '[@concierge-mantle/mcp] elicitation: URL-mode handoff requires the elicitation capability not advertised by the connected client.',
    );
  }
  const params: ElicitParams = {
    mode: 'url',
    message: opts.message,
    url: opts.url,
    elicitationId: opts.elicitationId ?? globalThis.crypto.randomUUID(),
  };
  const result = await opts.elicit(params);
  if (result.action !== 'accept') {
    throw new ConciergeError(
      'UserRejected',
      `[@concierge-mantle/mcp] elicitation: URL handoff not accepted (action='${String(result.action).replace(/[^A-Za-z0-9_-]/g, '')}').`,
      undefined,
      { action: result.action },
    );
  }
}

/**
 * Production wiring: derive `{elicit, capability}` from a connected
 * `McpServer` (`server.server` is the underlying `Server` instance per the
 * SDK 1.29 high-level / low-level API split).
 */
export function buildElicitationDeps(server: Server): {
  readonly elicit: ElicitFn;
  readonly capability: ElicitationCapability;
} {
  const capabilities = server.getClientCapabilities();
  // The MCP 2025-06-18 spec puts elicitation under `capabilities.elicitation`
  // (an object — empty or with feature flags). Presence === supported.
  const supported = capabilities?.elicitation !== undefined;
  return {
    elicit: (params) => server.elicitInput(params),
    capability: { supported },
  };
}
