import Anthropic from '@anthropic-ai/sdk';
import { ConciergeError } from '@concierge/sdk';

/**
 * Anthropic prompt-caching beta header. The SDK installs this header
 * automatically when `cache_control` markers are present in the request,
 * but we set it explicitly so:
 *   (a) cache hits show up on calls that happen to not carry markers yet
 *       (no silent regression when a tick phase hasn't been wired up);
 *   (b) the header value is visible in support tickets / log captures.
 *
 * See https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
 */
export const PROMPT_CACHING_BETA = 'prompt-caching-2024-07-31';

export interface CreateLlmClientConfig {
  /** Anthropic API key. Throws ConfigError if empty / missing. */
  readonly apiKey: string;
  /** Optional override for the API base URL (e.g. for a corporate proxy). */
  readonly baseURL?: string;
  /**
   * Optional extra default headers. Use sparingly — the package owns the
   * `anthropic-beta` header value (we MERGE rather than override so callers
   * can add additional beta features without dropping prompt caching).
   */
  readonly defaultHeaders?: Record<string, string>;
}

/**
 * Constructs an `Anthropic` SDK client with prompt-caching enabled by default.
 * Centralised so tick phases never re-implement the beta-header dance — if
 * Anthropic rotates the beta version string, this is the single spot to fix.
 *
 * Throws ConfigError (not raw) when apiKey is missing so the SDK's standard
 * discriminator (`err.type === 'ConfigError'`) works in callers' handlers.
 */
export function createLlmClient(config: CreateLlmClientConfig): Anthropic {
  if (!config.apiKey || typeof config.apiKey !== 'string') {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/llm] createLlmClient: apiKey is required (set ANTHROPIC_API_KEY).`,
    );
  }
  const callerHeaders = config.defaultHeaders ?? {};
  const callerBeta = callerHeaders['anthropic-beta'];
  // Preserve any extra betas the caller wired in (e.g. extended-thinking).
  const mergedBeta = callerBeta ? `${PROMPT_CACHING_BETA},${callerBeta}` : PROMPT_CACHING_BETA;
  return new Anthropic({
    apiKey: config.apiKey,
    ...(config.baseURL !== undefined && { baseURL: config.baseURL }),
    defaultHeaders: {
      ...callerHeaders,
      'anthropic-beta': mergedBeta,
    },
  });
}
