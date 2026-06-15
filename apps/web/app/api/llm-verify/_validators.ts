/**
 * Per-provider key validators. Each function attempts an authenticated
 * `models.list` (or equivalent read-only "is this key valid?" call) against
 * the provider, returns:
 *   - `{ ok: true, modelCount }` on success
 *   - `{ ok: false, reason }` on auth failure (401/403)
 *   - throws on network error / unexpected status (caller maps to 500)
 *
 * IMPORTANT: never log the key. Each fetch uses the key in a header; we
 * propagate only the provider's error code/text to the response, never
 * stringify or echo the request headers.
 *
 * Verified provider endpoints via Context7 / official docs 2026-06-15:
 *   Anthropic    GET https://api.anthropic.com/v1/models  (header: x-api-key)
 *   OpenAI       GET https://api.openai.com/v1/models     (header: Authorization)
 *   Google AI    GET https://generativelanguage.googleapis.com/v1beta/models (header: x-goog-api-key)
 *   xAI          GET https://api.x.ai/v1/models           (header: Authorization)
 */

export type ProviderId = 'anthropic' | 'openai' | 'google' | 'xai';

export type ValidationResult =
  | { readonly ok: true; readonly modelCount: number }
  | { readonly ok: false; readonly reason: string };

const TIMEOUT_MS = 8_000;

async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

function pickReason(status: number, fallback: string): string {
  if (status === 401 || status === 403) return 'invalid key';
  if (status === 429) return 'rate limited by provider';
  if (status >= 500) return 'provider unavailable';
  return fallback;
}

export async function validateAnthropic(key: string): Promise<ValidationResult> {
  const res = await fetchWithTimeout('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
  });
  if (!res.ok) return { ok: false, reason: pickReason(res.status, `http ${res.status}`) };
  const body = (await res.json()) as { data?: ReadonlyArray<unknown> };
  return { ok: true, modelCount: Array.isArray(body.data) ? body.data.length : 0 };
}

export async function validateOpenAi(key: string): Promise<ValidationResult> {
  const res = await fetchWithTimeout('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return { ok: false, reason: pickReason(res.status, `http ${res.status}`) };
  const body = (await res.json()) as { data?: ReadonlyArray<unknown> };
  return { ok: true, modelCount: Array.isArray(body.data) ? body.data.length : 0 };
}

export async function validateGoogle(key: string): Promise<ValidationResult> {
  // Use the `x-goog-api-key` HEADER, NOT the `?key=` query param. URL params
  // surface in every HTTP-instrumentation breadcrumb (Sentry, OpenTelemetry,
  // proxy logs, Google's own access logs); a header keeps the key out of
  // the URL surface entirely.
  const res = await fetchWithTimeout('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: { 'x-goog-api-key': key },
  });
  if (!res.ok) return { ok: false, reason: pickReason(res.status, `http ${res.status}`) };
  const body = (await res.json()) as { models?: ReadonlyArray<unknown> };
  return { ok: true, modelCount: Array.isArray(body.models) ? body.models.length : 0 };
}

export async function validateXai(key: string): Promise<ValidationResult> {
  const res = await fetchWithTimeout('https://api.x.ai/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return { ok: false, reason: pickReason(res.status, `http ${res.status}`) };
  const body = (await res.json()) as { data?: ReadonlyArray<unknown> };
  return { ok: true, modelCount: Array.isArray(body.data) ? body.data.length : 0 };
}

const VALIDATORS: Readonly<Record<ProviderId, (key: string) => Promise<ValidationResult>>> = {
  anthropic: validateAnthropic,
  openai: validateOpenAi,
  google: validateGoogle,
  xai: validateXai,
};

export async function validate(provider: ProviderId, key: string): Promise<ValidationResult> {
  const fn = VALIDATORS[provider];
  if (!fn) {
    // Defense in depth: even though the route's Zod schema gates `provider`,
    // direct callers (tests, future SDK consumers) could pass an unknown
    // value. Fail with a clean ValidationResult instead of `TypeError`.
    return { ok: false, reason: 'unknown provider' };
  }
  return fn(key);
}
