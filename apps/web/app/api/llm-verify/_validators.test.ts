import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  validate,
  validateAnthropic,
  validateGoogle,
  validateOpenAi,
  validateXai,
} from './_validators';

// Synthetic test key — must NOT match any real provider's prefix shape so
// secret-scanning hooks (gitleaks, GitGuardian) don't flag it.
const KEY = 'TEST_NOT_A_REAL_PROVIDER_KEY_1234567890_abcdefghij';

describe('validators never echo the key in their result', () => {
  // Spy on fetch so each test can assert ok/reason without hitting the network.
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it('Anthropic: 200 → ok:true with model count', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: [{ id: 'm1' }, { id: 'm2' }] }), { status: 200 }),
    ) as typeof fetch;
    const r = await validateAnthropic(KEY);
    expect(r).toEqual({ ok: true, modelCount: 2 });
    expect(JSON.stringify(r)).not.toContain(KEY);
  });

  it('Anthropic: 401 → ok:false, reason "invalid key"', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response('{"error":"unauthorized"}', { status: 401 }),
    ) as typeof fetch;
    const r = await validateAnthropic(KEY);
    expect(r).toEqual({ ok: false, reason: 'invalid key' });
    expect(JSON.stringify(r)).not.toContain(KEY);
  });

  it('OpenAI: 429 → ok:false, reason rate-limited', async () => {
    globalThis.fetch = vi.fn(async () => new Response('', { status: 429 })) as typeof fetch;
    const r = await validateOpenAi(KEY);
    expect(r).toEqual({ ok: false, reason: 'rate limited by provider' });
  });

  it('Google: success returns models array count', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ models: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] }), {
          status: 200,
        }),
    ) as typeof fetch;
    const r = await validateGoogle(KEY);
    expect(r).toEqual({ ok: true, modelCount: 3 });
  });

  it('xAI: provider 503 → ok:false, reason "provider unavailable"', async () => {
    globalThis.fetch = vi.fn(async () => new Response('', { status: 503 })) as typeof fetch;
    const r = await validateXai(KEY);
    expect(r).toEqual({ ok: false, reason: 'provider unavailable' });
  });

  it('validate dispatches by provider id', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ data: [] }), { status: 200 }),
    ) as typeof fetch;
    expect((await validate('openai', KEY)).ok).toBe(true);
  });

  it('validate returns ok:false instead of throwing on unknown provider', async () => {
    const r = await validate('mistral' as 'openai', KEY);
    expect(r).toEqual({ ok: false, reason: 'unknown provider' });
  });

  it('Google: never puts the key in the request URL', async () => {
    const captured: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      captured.push(typeof input === 'string' ? input : input.toString());
      return new Response(JSON.stringify({ models: [] }), { status: 200 });
    }) as typeof fetch;
    await validateGoogle(KEY);
    for (const url of captured) {
      expect(url).not.toContain(KEY);
    }
  });
});
