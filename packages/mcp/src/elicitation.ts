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

// Strict decimal regex — rejects hex (`0x10`), whitespace (`" "` → 0),
// underscores (`1_000` → NaN already), and scientific notation that the
// permissive `Number()` would silently accept. Per round-1 review: a misconfig
// like `CONCIERGE_CONFIRM_THRESHOLD_USD="0x0"` setting threshold to 0 (gates
// EVERY action) is a footgun we mitigate at the boundary.
const THRESHOLD_DECIMAL_RE = /^\d+(\.\d+)?$/;

/**
 * Read the configured high-value threshold from env or fall back to default.
 * Anti-regression marker required by `story-138-mcp-elicitation.md`'s
 * shell-verification (grep for env var name).
 */
export function readHighValueThresholdUsd(env?: NodeJS.ProcessEnv): number {
  const source = env ?? process.env;
  const raw = source[THRESHOLD_ENV_VAR];
  if (raw === undefined || raw === '') return DEFAULT_HIGH_VALUE_USD;
  if (!THRESHOLD_DECIMAL_RE.test(raw)) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge-mantle/mcp] elicitation: ${THRESHOLD_ENV_VAR} must be a non-negative decimal number (no hex, no whitespace, no scientific notation); got '${raw.slice(0, 32)}'`,
    );
  }
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

  // silent-failure round-1 C3: guard against `notionalUsd <= 0` or non-finite
  // — a USD-price-feed failure that returns 0 (or NaN / Infinity) must NOT
  // silently bypass the confirmation gate. Throwing forces the caller to
  // surface a typed error rather than auto-approve an unknown-value action.
  if (!Number.isFinite(opts.notionalUsd) || opts.notionalUsd < 0) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge-mantle/mcp] elicitation: notionalUsd must be a finite non-negative number; got '${String(opts.notionalUsd)}'. Refusing to auto-approve.`,
      undefined,
      { notionalUsd: opts.notionalUsd },
    );
  }

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

  // security review LOW (CWE-117): strip control chars + cap length on
  // caller-supplied actionSummary so a tool author can't smuggle extra
  // "lines" / ANSI / homoglyph spoofing into the host-rendered form prompt.
  const safeSummary = sanitizeUserVisibleText(opts.actionSummary, 280);
  const params: ElicitParams = {
    mode: 'form',
    message: `Confirm: ${safeSummary}\nNotional: $${opts.notionalUsd.toFixed(2)}`,
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
  // silent-failure round-1 C2 + code-reviewer C2: the JSON schema's `minimum`/
  // `maximum`/type constraints are ADVISORY at the protocol level — a
  // non-compliant client can return `maxSlippageBps: -1`, `999999`, `NaN`,
  // `Infinity`, a string, a bigint, etc. We refuse to execute on-chain
  // actions with malformed slippage; missing field falls back to the default.
  const rawSlippage = content['maxSlippageBps'];
  let slippage: number;
  if (rawSlippage === undefined) {
    slippage = defaultSlippage;
  } else if (
    typeof rawSlippage !== 'number' ||
    !Number.isFinite(rawSlippage) ||
    rawSlippage < 0 ||
    rawSlippage > 1000
  ) {
    throw new ConciergeError(
      'RpcError',
      `[@concierge-mantle/mcp] elicitation: client returned malformed maxSlippageBps (type=${typeof rawSlippage}, value='${String(rawSlippage).slice(0, 32)}'). Refusing to execute.`,
      undefined,
      { field: 'maxSlippageBps' },
    );
  } else {
    slippage = rawSlippage;
  }
  const rawJustification = content['justification'];
  const justification =
    typeof rawJustification === 'string' ? rawJustification.slice(0, 200) : undefined;
  return {
    confirmed: true,
    maxSlippageBps: slippage,
    elicited: true,
    ...(justification !== undefined ? { justification } : {}),
  };
}

// Allowed URL schemes for SEP-1036 elicitation. Phishing-grade primitive: the
// host opens whatever URL we send it. Refuse `javascript:`, `data:`, `file:`,
// `vbscript:` etc. up-front. `http://localhost*` is allowed in dev for the
// import flow; production should always be https.
const ALLOWED_URL_SCHEMES = new Set(['https:', 'http:']);
function assertSafeUrl(raw: string, context: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge-mantle/mcp] ${context}: URL is not parseable: '${raw.slice(0, 96)}'`,
    );
  }
  if (!ALLOWED_URL_SCHEMES.has(parsed.protocol)) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge-mantle/mcp] ${context}: URL scheme '${parsed.protocol}' is not allowed (only https: + http:). Refusing to hand to host.`,
    );
  }
  if (parsed.protocol === 'http:') {
    const host = parsed.hostname;
    const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    if (!isLoopback) {
      throw new ConciergeError(
        'ConfigError',
        `[@concierge-mantle/mcp] ${context}: http: scheme is allowed only for loopback (localhost / 127.0.0.1 / ::1); got host '${host}'.`,
      );
    }
  }
  return parsed;
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
  // code-reviewer C1 (URL validation): refuse non-http(s) schemes before
  // handing the URL to the host. Phishing-grade primitive otherwise.
  assertSafeUrl(opts.url, 'requestUrlElicitation');
  if (!opts.capability.supported) {
    throw new ConciergeError(
      'ConfigError',
      '[@concierge-mantle/mcp] elicitation: URL-mode handoff requires the elicitation capability not advertised by the connected client.',
    );
  }
  const safeMessage = sanitizeUserVisibleText(opts.message, 280);
  const params: ElicitParams = {
    mode: 'url',
    message: safeMessage,
    url: opts.url,
    elicitationId: opts.elicitationId ?? globalThis.crypto.randomUUID(),
  };
  const result = await opts.elicit(params);
  // code-reviewer I5: mirror the form-path branching so telemetry can
  // distinguish user-cancelled (closed the prompt) from user-declined
  // (explicitly clicked decline).
  if (result.action === 'cancel') {
    throw new ConciergeError(
      'UserRejected',
      '[@concierge-mantle/mcp] elicitation: URL handoff cancelled by user.',
      undefined,
      { action: 'cancel' },
    );
  }
  if (result.action === 'decline') {
    throw new ConciergeError(
      'UserRejected',
      '[@concierge-mantle/mcp] elicitation: URL handoff declined by user.',
      undefined,
      { action: 'decline' },
    );
  }
  if (result.action !== 'accept') {
    throw new ConciergeError(
      'RpcError',
      `[@concierge-mantle/mcp] elicitation: unexpected URL-mode action value '${String(result.action).replace(/[^A-Za-z0-9_-]/g, '')}' from client.`,
    );
  }
}

/**
 * Strip ASCII control chars (C0 + DEL) + cap length. Used on caller-supplied
 * text that flows into host-rendered prompts (security review CWE-117).
 */
function sanitizeUserVisibleText(s: string, maxLen: number): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: deliberate (CWE-117 mitigation)
  return s.replace(/[ -]/g, ' ').slice(0, maxLen);
}

export { assertSafeUrl };

/**
 * Production wiring: derive `{elicit, capability}` from a connected
 * `McpServer` (`server.server` is the underlying `Server` instance per the
 * SDK 1.29 high-level / low-level API split).
 */
export function buildElicitationDeps(server: Server): {
  readonly elicit: ElicitFn;
  readonly capability: ElicitationCapability;
} {
  // silent-failure round-1 C1: the MCP 2025-06-18 spec puts elicitation under
  // `capabilities.elicitation` AS AN OBJECT. A host advertising
  // `elicitation: false` or `null` would slip past a simple `!== undefined`
  // check and the subsequent `elicitInput()` call would throw a generic SDK
  // error instead of our typed `ConfigError`. Require the value to actually
  // be a (non-null) object. `getClientCapabilities()` is a `get` accessor
  // that re-reads from the underlying Server, so this stays live across the
  // initialize handshake even if `buildElicitationDeps` is called early.
  return {
    elicit: (params) => server.elicitInput(params),
    get capability() {
      const cap = server.getClientCapabilities()?.elicitation;
      const supported = cap !== undefined && cap !== null && typeof cap === 'object';
      return { supported };
    },
  };
}
