/**
 * Defense-in-depth: strip API-key-like fragments from error messages before
 * we render them in the UI. The upstream packages already sanitize their own
 * keys (`createConciergeAccount` runs `sanitizeCause(err, apiKey)` before
 * throwing), but the boundary into the browser is a good place to redact
 * anything that slipped through — viem / ZeroDev / Pimlico revert traces
 * sometimes echo the bundler RPC URL with the key in the query string.
 */
const REDACTED = '[redacted]';

const PATTERNS: ReadonlyArray<RegExp> = [
  // Pimlico-style `apikey=...` (case-insensitive) — preserve the param name
  // so the redaction is legible.
  /\bapikey=[^&\s"']+/gi,
  // Anthropic-style `sk-ant-...` and OpenAI-style `sk-...` LLM keys (BYOK
  // keys could in theory wind up in a thrown error during r3+).
  /\bsk-[a-zA-Z0-9-_]{12,}/g,
];

export function sanitizeErrorMessage(input: unknown): string {
  const raw = input instanceof Error ? input.message : String(input);
  return PATTERNS.reduce((acc, re) => acc.replace(re, REDACTED), raw);
}
