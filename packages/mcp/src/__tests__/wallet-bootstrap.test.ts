import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertModelEnvOrExit,
  bootstrapWallet,
  defaultConfigPath,
  type WalletConfig,
} from '../wallet-bootstrap.ts';

const POSIX = process.platform !== 'win32';

describe('bootstrapWallet — first run', () => {
  let tmp: string;
  let configPath: string;

  beforeEach(() => {
    tmp = mkdtempSync(resolve(tmpdir(), 'concierge-bootstrap-'));
    configPath = resolve(tmp, '.concierge/config.json');
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  it('generates a fresh 32-byte hex session key + writes config.json', () => {
    const cfg = bootstrapWallet({ configPath, now: () => '2026-06-13T12:00:00.000Z' });
    expect(cfg.sessionKey).toMatch(/^0x[0-9a-f]{64}$/);
    expect(cfg.rpcUrl).toBe('https://rpc.mantle.xyz');
    expect(cfg.chainId).toBe(5000);
    expect(cfg.agentId).toBeNull();
    expect(cfg.createdAt).toBe('2026-06-13T12:00:00.000Z');
    expect(existsSync(configPath)).toBe(true);
  });

  it.runIf(POSIX)('persists with mode 0600 on file and 0700 on dir (CWE-276)', () => {
    bootstrapWallet({ configPath });
    expect(statSync(configPath).mode & 0o777).toBe(0o600);
    expect(statSync(resolve(tmp, '.concierge')).mode & 0o777).toBe(0o700);
  });

  it('honors CONCIERGE_RPC_URL env override (per ADR-016)', () => {
    vi.stubEnv('CONCIERGE_RPC_URL', 'https://rpc.sepolia.mantle.xyz');
    try {
      const cfg = bootstrapWallet({ configPath });
      expect(cfg.rpcUrl).toBe('https://rpc.sepolia.mantle.xyz');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('agentId starts null — story-138 import flow populates it later', () => {
    const cfg = bootstrapWallet({ configPath });
    expect(cfg.agentId).toBeNull();
  });

  it('NEVER logs the session key (anti-leak: stdio bin reserves stdout for MCP)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const cfg = bootstrapWallet({ configPath });
      // The key MUST NOT appear in any log call.
      for (const call of logSpy.mock.calls) {
        for (const arg of call) expect(String(arg)).not.toContain(cfg.sessionKey);
      }
      for (const call of stderrSpy.mock.calls) {
        for (const arg of call) expect(String(arg)).not.toContain(cfg.sessionKey);
      }
    } finally {
      logSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });
});

describe('bootstrapWallet — second run (idempotency)', () => {
  let tmp: string;
  let configPath: string;
  beforeEach(() => {
    tmp = mkdtempSync(resolve(tmpdir(), 'concierge-bootstrap-'));
    configPath = resolve(tmp, '.concierge/config.json');
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  it('returns the existing config unchanged on second call', () => {
    const first = bootstrapWallet({ configPath });
    const second = bootstrapWallet({ configPath });
    expect(second).toEqual(first);
  });

  it('does NOT overwrite a valid existing config (preserves user-imported keys)', () => {
    const first = bootstrapWallet({ configPath });
    const beforeMtime = statSync(configPath).mtimeMs;
    // 10ms gap to make any potential rewrite visible.
    const re = bootstrapWallet({ configPath });
    expect(re.sessionKey).toBe(first.sessionKey);
    expect(statSync(configPath).mtimeMs).toBe(beforeMtime);
  });

  it('THROWS on malformed config (refuses to silently regenerate over corrupt state)', () => {
    // Create the parent dir first by bootstrapping at an unrelated path.
    bootstrapWallet({ configPath: resolve(tmp, '.concierge/_unused.json') });
    writeFileSync(configPath, '{"sessionKey":"not-hex"}', { mode: 0o600 });
    expect(() => bootstrapWallet({ configPath })).toThrow(/malformed/);
  });

  it('THROWS on syntactically-invalid JSON (same refusal — never silently regen)', () => {
    // Create the directory by running bootstrap once at an unrelated path.
    bootstrapWallet({ configPath: resolve(tmp, '.concierge/_unused.json') });
    writeFileSync(configPath, 'this is not json', { mode: 0o600 });
    expect(() => bootstrapWallet({ configPath })).toThrow(/malformed/);
  });
});

describe('defaultConfigPath', () => {
  it('resolves to ~/.concierge/config.json', () => {
    const path = defaultConfigPath();
    expect(path).toContain('.concierge');
    expect(path).toContain('config.json');
  });
});

describe('assertModelEnvOrExit', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Clear all known model env vars for a deterministic baseline.
    vi.stubEnv('AI_MODEL', '');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '');
    vi.stubEnv('XAI_API_KEY', '');
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit-${code}`);
    }) as never);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('exits 2 with a pointed stderr message when NO provider is configured', () => {
    expect(() => assertModelEnvOrExit()).toThrow('exit-2');
    const calls = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(calls).toContain('FATAL');
    expect(calls).toContain('ANTHROPIC_API_KEY');
    expect(calls).toContain('OPENAI_API_KEY');
    expect(calls).toContain('AI_MODEL');
  });

  it('returns silently when ANTHROPIC_API_KEY is set', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test');
    expect(() => assertModelEnvOrExit()).not.toThrow();
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('returns silently when AI_MODEL is set (explicit provider choice)', () => {
    vi.stubEnv('AI_MODEL', 'openai:gpt-5.1');
    expect(() => assertModelEnvOrExit()).not.toThrow();
  });

  it('returns silently for each of the 4 supported provider keys', () => {
    for (const key of [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'GOOGLE_GENERATIVE_AI_API_KEY',
      'XAI_API_KEY',
    ] as const) {
      vi.stubEnv('AI_MODEL', '');
      for (const other of [
        'ANTHROPIC_API_KEY',
        'OPENAI_API_KEY',
        'GOOGLE_GENERATIVE_AI_API_KEY',
        'XAI_API_KEY',
      ]) {
        vi.stubEnv(other, '');
      }
      vi.stubEnv(key, 'test-value');
      expect(() => assertModelEnvOrExit(), `failed for ${key}`).not.toThrow();
    }
  });
});

describe('parseConfig contract (via bootstrapWallet round-trip)', () => {
  let tmp: string;
  let configPath: string;
  beforeEach(() => {
    tmp = mkdtempSync(resolve(tmpdir(), 'concierge-bootstrap-'));
    configPath = resolve(tmp, '.concierge/config.json');
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  it('written config round-trips through readFileSync + JSON.parse', () => {
    const written = bootstrapWallet({ configPath });
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as WalletConfig;
    expect(parsed.sessionKey).toBe(written.sessionKey);
    expect(parsed.chainId).toBe(5000);
  });
});
