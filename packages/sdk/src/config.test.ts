import { describe, expect, it } from 'vitest';
import { type ConciergeConfig, ConfigSchema, loadConfig } from './config.ts';
import { ConfigError } from './errors.ts';

const VALID_ENV = {
  ANTHROPIC_API_KEY: 'sk-ant-test-xxxxxxxxxxxxxxxxxxxx',
  DATABASE_URL: 'postgres://user:pass@localhost:5432/concierge',
  REDIS_URL: 'redis://localhost:6379',
  MANTLE_RPC_URL: 'https://rpc.mantle.xyz',
  MANTLE_SEPOLIA_RPC_URL: 'https://rpc.sepolia.mantle.xyz',
  MANTLE_CHAIN_ID: '5000',
  NODE_ENV: 'test',
} as const;

describe('loadConfig — happy path (story-24)', () => {
  it('returns typed config with camelCase keys', () => {
    const config = loadConfig({ ...VALID_ENV });
    expect(config.anthropicApiKey).toBe(VALID_ENV.ANTHROPIC_API_KEY);
    expect(config.databaseUrl).toBe(VALID_ENV.DATABASE_URL);
    expect(config.redisUrl).toBe(VALID_ENV.REDIS_URL);
    expect(config.mantleRpcUrl).toBe(VALID_ENV.MANTLE_RPC_URL);
    expect(config.mantleChainId).toBe(5000);
  });

  it('MANTLE_CHAIN_ID string → number (coercion)', () => {
    const config = loadConfig({ ...VALID_ENV, MANTLE_CHAIN_ID: '5000' });
    expect(typeof config.mantleChainId).toBe('number');
    expect(config.mantleChainId).toBe(5000);
  });

  it('accepts MANTLE_CHAIN_ID 5003 (Sepolia)', () => {
    expect(loadConfig({ ...VALID_ENV, MANTLE_CHAIN_ID: '5003' }).mantleChainId).toBe(5003);
  });

  it('optional vars are undefined when absent', () => {
    const config = loadConfig({ ...VALID_ENV });
    expect(config.zeroDevProjectId).toBeUndefined();
    expect(config.pimlicoApiKey).toBeUndefined();
    expect(config.lifiApiKey).toBeUndefined();
    expect(config.sentryDsn).toBeUndefined();
  });

  it('optional vars are forwarded when present', () => {
    const config = loadConfig({
      ...VALID_ENV,
      ZERODEV_PROJECT_ID: 'zd-123',
      LIFI_API_KEY: 'lifi-abc',
    });
    expect(config.zeroDevProjectId).toBe('zd-123');
    expect(config.lifiApiKey).toBe('lifi-abc');
  });
});

describe('loadConfig — defaults (story-24)', () => {
  it('MANTLE_RPC_URL defaults when omitted', () => {
    const { MANTLE_RPC_URL: _, ...rest } = VALID_ENV;
    expect(loadConfig({ ...rest }).mantleRpcUrl).toBe('https://rpc.mantle.xyz');
  });

  it('MANTLE_SEPOLIA_RPC_URL defaults when omitted', () => {
    const { MANTLE_SEPOLIA_RPC_URL: _, ...rest } = VALID_ENV;
    expect(loadConfig({ ...rest }).mantleSepoliaRpcUrl).toBe('https://rpc.sepolia.mantle.xyz');
  });

  it('NODE_ENV defaults to "development" when omitted', () => {
    const { NODE_ENV: _, ...rest } = VALID_ENV;
    expect(loadConfig({ ...rest }).nodeEnv).toBe('development');
  });

  it('accepts no argument — uses process.env (will throw, but must not crash type-wise)', () => {
    expect(() => loadConfig()).toThrow(ConfigError);
  });
});

describe('loadConfig — validation failures (story-24)', () => {
  it('missing ANTHROPIC_API_KEY throws ConfigError', () => {
    const { ANTHROPIC_API_KEY: _, ...rest } = VALID_ENV;
    expect(() => loadConfig({ ...rest })).toThrow(ConfigError);
  });

  it('missing DATABASE_URL throws ConfigError', () => {
    const { DATABASE_URL: _, ...rest } = VALID_ENV;
    expect(() => loadConfig({ ...rest })).toThrow(ConfigError);
  });

  it('missing REDIS_URL throws ConfigError', () => {
    const { REDIS_URL: _, ...rest } = VALID_ENV;
    expect(() => loadConfig({ ...rest })).toThrow(ConfigError);
  });

  it('MANTLE_CHAIN_ID 999 (invalid) throws ConfigError', () => {
    expect(() => loadConfig({ ...VALID_ENV, MANTLE_CHAIN_ID: '999' })).toThrow(ConfigError);
  });

  it('DATABASE_URL non-URL throws ConfigError', () => {
    expect(() => loadConfig({ ...VALID_ENV, DATABASE_URL: 'not-a-url' })).toThrow(ConfigError);
  });

  it('MANTLE_RPC_URL non-URL throws ConfigError', () => {
    expect(() => loadConfig({ ...VALID_ENV, MANTLE_RPC_URL: 'not-a-url' })).toThrow(ConfigError);
  });

  it('ANTHROPIC_API_KEY without sk-ant- prefix throws ConfigError', () => {
    expect(() =>
      loadConfig({ ...VALID_ENV, ANTHROPIC_API_KEY: 'sk-openai-wrong-prefix-xx' }),
    ).toThrow(ConfigError);
  });

  it('ANTHROPIC_API_KEY correct prefix but too short (< 20 chars) throws ConfigError', () => {
    // min(20) and regex are independent guards — test them separately
    expect(() => loadConfig({ ...VALID_ENV, ANTHROPIC_API_KEY: 'sk-ant-x' })).toThrow(ConfigError);
  });

  it('ANTHROPIC_API_KEY empty string throws ConfigError', () => {
    expect(() => loadConfig({ ...VALID_ENV, ANTHROPIC_API_KEY: '' })).toThrow(ConfigError);
  });

  it('DATABASE_URL empty string throws ConfigError', () => {
    expect(() => loadConfig({ ...VALID_ENV, DATABASE_URL: '' })).toThrow(ConfigError);
  });

  it('NODE_ENV invalid value (e.g. "staging") throws ConfigError', () => {
    expect(() => loadConfig({ ...VALID_ENV, NODE_ENV: 'staging' })).toThrow(ConfigError);
  });

  it('SENTRY_DSN non-URL string throws ConfigError', () => {
    expect(() => loadConfig({ ...VALID_ENV, SENTRY_DSN: 'sentry-placeholder' })).toThrow(
      ConfigError,
    );
  });

  it('SENTRY_DSN empty string treated as absent — does NOT throw', () => {
    expect(() => loadConfig({ ...VALID_ENV, SENTRY_DSN: '' })).not.toThrow();
    expect(loadConfig({ ...VALID_ENV, SENTRY_DSN: '' }).sentryDsn).toBeUndefined();
  });
});

describe('loadConfig — ConfigError shape (story-24)', () => {
  it('thrown error has type "ConfigError" and includes field name in message', () => {
    // The message must be immediately actionable without inspecting metadata —
    // most loggers only capture err.message, not structured properties.
    const { DATABASE_URL: _, ...rest } = VALID_ENV;
    expect(() => loadConfig({ ...rest })).toThrow(ConfigError);
    try {
      loadConfig({ ...rest });
      expect.fail('should have thrown');
    } catch (err) {
      const e = err as ConfigError;
      expect(e.type).toBe('ConfigError');
      expect(e.message).toContain('DATABASE_URL');
    }
  });

  it('thrown error carries metadata with Zod issues array', () => {
    const { DATABASE_URL: _, ...rest } = VALID_ENV;
    try {
      loadConfig({ ...rest });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      const meta = (err as ConfigError).metadata;
      expect(meta).toBeDefined();
      // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature forces bracket notation
      expect(Array.isArray(meta?.['issues'])).toBe(true);
    }
  });

  it('forwarding test for remaining optional fields (pinataJwt, web3StorageToken, privyAppId, privyServerKey)', () => {
    const config = loadConfig({
      ...VALID_ENV,
      PINATA_JWT: 'pinata-jwt-token',
      WEB3_STORAGE_TOKEN: 'w3s-token',
      PRIVY_APP_ID: 'privy-app-123',
      PRIVY_SERVER_KEY: 'privy-key-abc',
    });
    expect(config.pinataJwt).toBe('pinata-jwt-token');
    expect(config.web3StorageToken).toBe('w3s-token');
    expect(config.privyAppId).toBe('privy-app-123');
    expect(config.privyServerKey).toBe('privy-key-abc');
  });
});

describe('ConfigSchema (story-24)', () => {
  it('parses valid env successfully', () => {
    const result = ConfigSchema.safeParse({ ...VALID_ENV });
    expect(result.success).toBe(true);
  });

  it('returns issues on invalid input', () => {
    const result = ConfigSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it('ConciergeConfig type is assignable from loadConfig return (compile-time check)', () => {
    const _config: ConciergeConfig = loadConfig({ ...VALID_ENV });
    expect(_config.anthropicApiKey).toBeDefined();
  });
});
