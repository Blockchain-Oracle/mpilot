import { ConciergeError } from '@concierge/sdk';
import { describe, expect, it } from 'vitest';
import { createLlmClient, mergeBetaHeader, PROMPT_CACHING_BETA } from '../client.ts';

describe('mergeBetaHeader (pure)', () => {
  it('returns just PROMPT_CACHING_BETA when caller has no beta header', () => {
    expect(mergeBetaHeader(undefined)).toBe(PROMPT_CACHING_BETA);
    expect(mergeBetaHeader('')).toBe(PROMPT_CACHING_BETA);
    expect(mergeBetaHeader('   ')).toBe(PROMPT_CACHING_BETA);
  });

  it('preserves caller order then appends PROMPT_CACHING_BETA (caller-precedence semantics)', () => {
    expect(mergeBetaHeader('extended-thinking-2025')).toBe(
      `extended-thinking-2025,${PROMPT_CACHING_BETA}`,
    );
  });

  it('does not duplicate PROMPT_CACHING_BETA when caller already supplied it', () => {
    expect(mergeBetaHeader(PROMPT_CACHING_BETA)).toBe(PROMPT_CACHING_BETA);
    expect(mergeBetaHeader(`extended-thinking-2025,${PROMPT_CACHING_BETA}`)).toBe(
      `extended-thinking-2025,${PROMPT_CACHING_BETA}`,
    );
  });

  it('trims whitespace and drops empty parts (silent-corruption guard)', () => {
    expect(mergeBetaHeader('extended-thinking-2025 , , ,')).toBe(
      `extended-thinking-2025,${PROMPT_CACHING_BETA}`,
    );
  });
});

describe('createLlmClient', () => {
  it('throws ConfigError when apiKey is empty', () => {
    try {
      createLlmClient({ apiKey: '' });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConciergeError);
      expect((e as ConciergeError).type).toBe('ConfigError');
    }
  });

  it('throws ConfigError when apiKey is whitespace-only', () => {
    expect(() => createLlmClient({ apiKey: '   ' })).toThrow(/apiKey is required/);
  });

  it('throws ConfigError when apiKey is not a string', () => {
    expect(() => createLlmClient({ apiKey: undefined as unknown as string })).toThrow(
      /apiKey is required/,
    );
  });

  it('returns an Anthropic client instance', () => {
    const client = createLlmClient({ apiKey: 'sk-ant-fixture-not-real' });
    expect(client).toBeDefined();
  });

  it('SECURITY: rejects defaultHeaders containing reserved x-api-key', () => {
    expect(() =>
      createLlmClient({
        apiKey: 'sk-ant-fixture-not-real',
        defaultHeaders: { 'x-api-key': 'attacker-key' },
      }),
    ).toThrow(/reserved key 'x-api-key'/);
  });

  it('SECURITY: rejects authorization header (any case)', () => {
    expect(() =>
      createLlmClient({
        apiKey: 'sk-ant-fixture-not-real',
        defaultHeaders: { Authorization: 'Bearer x' },
      }),
    ).toThrow(/reserved key/);
  });

  it('SECURITY: rejects anthropic-version override', () => {
    expect(() =>
      createLlmClient({
        apiKey: 'sk-ant-fixture-not-real',
        defaultHeaders: { 'anthropic-version': '1900-01-01' },
      }),
    ).toThrow(/reserved key/);
  });

  it('SECURITY: rejects non-https baseURL (CWE-918 exfil defense)', () => {
    expect(() =>
      createLlmClient({
        apiKey: 'sk-ant-fixture-not-real',
        baseURL: 'http://evil.example/v1',
      }),
    ).toThrow(/must use https:/);
  });

  it('SECURITY: rejects malformed baseURL', () => {
    expect(() =>
      createLlmClient({
        apiKey: 'sk-ant-fixture-not-real',
        baseURL: 'not a url',
      }),
    ).toThrow(/not a valid URL/);
  });

  it('accepts an https proxy baseURL', () => {
    const client = createLlmClient({
      apiKey: 'sk-ant-fixture-not-real',
      baseURL: 'https://proxy.example.com/v1',
    });
    expect(client).toBeDefined();
  });

  it('accepts non-reserved custom headers (allowlist passthrough)', () => {
    const client = createLlmClient({
      apiKey: 'sk-ant-fixture-not-real',
      defaultHeaders: { 'x-telemetry-tag': 'concierge-tick-loop' },
    });
    expect(client).toBeDefined();
  });
});
