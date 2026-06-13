import Anthropic from '@anthropic-ai/sdk';
import { ConciergeError } from '@concierge/sdk';

/**
 * Anthropic prompt-caching beta header. The SDK installs this header
 * automatically when `cache_control` markers are present in the request,
 * but we set it explicitly so a tick phase that hasn't been wired up yet
 * still uses caching once it adds markers.
 *
 * Anthropic accepts unknown beta tokens silently (fails-open into "no
 * caching"); rotation = a cost regression, not a 4xx. Tests should pin
 * cache-hit shape against a recorded fixture as a follow-up.
 *
 * See https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
 */
export const PROMPT_CACHING_BETA = 'prompt-caching-2024-07-31';

/**
 * Headers the SDK / Anthropic OWN and that callers MUST NOT supply via
 * `defaultHeaders`. Lowercase comparison; anthropic-beta is handled by
 * `mergeBetaHeader` (not denied — merged).
 */
const RESERVED_HEADER_KEYS = Object.freeze(['x-api-key', 'authorization', 'anthropic-version']);

export interface CreateLlmClientConfig {
  /** Anthropic API key. Required; throws ConfigError on empty/missing/whitespace. */
  readonly apiKey: string;
  /**
   * Optional API base URL override. MUST be `https:`. Pass a corporate proxy
   * here, NEVER an env-var-driven attacker URL — a malicious baseURL exfils
   * the apiKey on the very next request (CWE-918).
   */
  readonly baseURL?: string;
  /**
   * Optional extra default headers. The package OWNS `anthropic-beta` (we
   * merge rather than overwrite) and REJECTS `x-api-key`, `authorization`,
   * and `anthropic-version` (caller-replaced auth would silently swap the
   * client's credentials — see RESERVED_HEADER_KEYS).
   */
  readonly defaultHeaders?: Record<string, string>;
}

/**
 * Pure beta-header merge. Pulled out as its own function so it's unit-
 * testable without poking at the SDK's private `_options`. Caller's existing
 * betas come FIRST (preserves caller's precedence semantics — Anthropic's
 * beta gating is order-sensitive in some cases); PROMPT_CACHING_BETA appended
 * only if not already present.
 *
 * Empty / whitespace-only caller value is treated as absent.
 */
export function mergeBetaHeader(callerValue: string | undefined): string {
  const parts = (callerValue ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (!parts.includes(PROMPT_CACHING_BETA)) parts.push(PROMPT_CACHING_BETA);
  return parts.join(',');
}

function assertHeadersAllowed(headers: Record<string, string>): void {
  for (const k of Object.keys(headers)) {
    if (RESERVED_HEADER_KEYS.includes(k.toLowerCase())) {
      throw new ConciergeError(
        'ConfigError',
        `[@concierge/llm] createLlmClient: defaultHeaders may not contain reserved key '${k}' (RESERVED_HEADER_KEYS: ${RESERVED_HEADER_KEYS.join(', ')}).`,
      );
    }
  }
}

function assertBaseURL(baseURL: string): void {
  let url: URL;
  try {
    url = new URL(baseURL);
  } catch {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/llm] createLlmClient: baseURL is not a valid URL.`,
    );
  }
  if (url.protocol !== 'https:') {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/llm] createLlmClient: baseURL must use https: (got '${url.protocol}').`,
    );
  }
}

/**
 * Constructs an `Anthropic` SDK client with prompt-caching enabled and
 * caller-supplied auth headers rejected. Centralised so tick phases never
 * re-implement the beta-header dance or accidentally accept attacker-
 * controlled headers.
 */
export function createLlmClient(config: CreateLlmClientConfig): Anthropic {
  if (typeof config.apiKey !== 'string' || config.apiKey.trim() === '') {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/llm] createLlmClient: apiKey is required (set ANTHROPIC_API_KEY).`,
    );
  }
  if (config.baseURL !== undefined) assertBaseURL(config.baseURL);
  const callerHeaders = config.defaultHeaders ?? {};
  assertHeadersAllowed(callerHeaders);
  const mergedBeta = mergeBetaHeader(callerHeaders['anthropic-beta']);
  return new Anthropic({
    apiKey: config.apiKey,
    ...(config.baseURL !== undefined && { baseURL: config.baseURL }),
    defaultHeaders: {
      ...callerHeaders,
      'anthropic-beta': mergedBeta,
    },
  });
}
