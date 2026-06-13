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

  it('round-1: NEVER leaks session key on ANY logger (stdout MCP channel + all console.*)', () => {
    // Round-1 silent-failure HIGH: stdout is the MCP JSON-RPC channel. A
    // regression writing the key there would both corrupt MCP framing AND
    // leak the key. Round-0 spied only console.log + stderr.
    const spies = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      dir: vi.spyOn(console, 'dir').mockImplementation(() => {}),
      stdout: vi.spyOn(process.stdout, 'write').mockImplementation(() => true),
      stderr: vi.spyOn(process.stderr, 'write').mockImplementation(() => true),
    } as const;
    try {
      const cfg = bootstrapWallet({ configPath });
      // Drop the `0x` prefix so a substring check still works against fragments.
      const keyHex = cfg.sessionKey.slice(2);
      for (const [label, spy] of Object.entries(spies)) {
        for (const call of (spy.mock as { calls: unknown[][] }).calls) {
          for (const arg of call) {
            const text = String(arg);
            expect(text, `${label} leaked session key`).not.toContain(cfg.sessionKey);
            expect(text, `${label} leaked session key hex body`).not.toContain(keyHex);
          }
        }
      }
    } finally {
      for (const spy of Object.values(spies)) spy.mockRestore();
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

  it('round-1: does NOT overwrite a valid existing config (byte-equality, mtime-resolution-independent)', () => {
    // Round-1 (test #3): mtime granularity varies by filesystem. Asserting
    // raw byte-equality of the persisted JSON is the rewrite-detection check
    // regardless of fs mtime resolution.
    const first = bootstrapWallet({ configPath });
    const bytesBefore = readFileSync(configPath);
    const re = bootstrapWallet({ configPath });
    expect(re.sessionKey).toBe(first.sessionKey);
    expect(readFileSync(configPath).equals(bytesBefore)).toBe(true);
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

  it('round-1: THROWS on wrong-type sessionKey (JSON-valid, shape-invalid)', () => {
    // Round-1 (test #4): parseConfig's type-check path was untested.
    bootstrapWallet({ configPath: resolve(tmp, '.concierge/_unused.json') });
    writeFileSync(configPath, JSON.stringify({ sessionKey: 42, chainId: 5000 }), {
      mode: 0o600,
    });
    expect(() => bootstrapWallet({ configPath })).toThrow(/malformed/);
  });

  it('round-1: THROWS on missing chainId (required field)', () => {
    bootstrapWallet({ configPath: resolve(tmp, '.concierge/_unused.json') });
    writeFileSync(
      configPath,
      JSON.stringify({
        sessionKey: `0x${'a'.repeat(64)}`,
        rpcUrl: 'https://rpc.mantle.xyz',
        agentId: null,
        createdAt: '2026-06-13T12:00:00Z',
      }),
      { mode: 0o600 },
    );
    expect(() => bootstrapWallet({ configPath })).toThrow(/malformed/);
  });

  it('round-1: THROWS on non-integer chainId (5000.5 or "5000")', () => {
    bootstrapWallet({ configPath: resolve(tmp, '.concierge/_unused.json') });
    writeFileSync(
      configPath,
      JSON.stringify({
        sessionKey: `0x${'a'.repeat(64)}`,
        rpcUrl: 'https://rpc.mantle.xyz',
        chainId: '5000',
        agentId: null,
        createdAt: '2026-06-13T12:00:00Z',
      }),
      { mode: 0o600 },
    );
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

  it('returns silently when AI_MODEL + matching provider key are BOTH set', () => {
    vi.stubEnv('AI_MODEL', 'openai:gpt-5.1');
    vi.stubEnv('OPENAI_API_KEY', 'sk-...');
    expect(() => assertModelEnvOrExit()).not.toThrow();
  });

  it('round-1 HIGH: AI_MODEL set WITHOUT matching key → exit 2 (loud at startup, not at inference)', () => {
    // Round-1 silent-failure HIGH: AI_MODEL="openai:..." without
    // OPENAI_API_KEY was passing the check (any key sufficed), deferring
    // the failure to first inference. Now: provider-specific assertion.
    vi.stubEnv('AI_MODEL', 'openai:gpt-5.1');
    // ANTHROPIC_API_KEY is irrelevant to openai — should NOT save us.
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test');
    expect(() => assertModelEnvOrExit()).toThrow('exit-2');
    const calls = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(calls).toContain('OPENAI_API_KEY');
    expect(calls).toContain('AI_MODEL');
  });

  it('round-1: AI_MODEL with unknown provider → exit 2 with supported-list message', () => {
    vi.stubEnv('AI_MODEL', 'mistral:large');
    expect(() => assertModelEnvOrExit()).toThrow('exit-2');
    const calls = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(calls).toContain('unknown provider');
    expect(calls).toContain('mistral');
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

describe('bootstrapWallet — round-1 atomic-write race (TOCTOU CRITICAL)', () => {
  let tmp: string;
  let configPath: string;
  beforeEach(() => {
    tmp = mkdtempSync(resolve(tmpdir(), 'concierge-bootstrap-race-'));
    configPath = resolve(tmp, '.concierge/config.json');
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  it('round-1 CRITICAL: race-winner config is preserved if a parallel write lands first', () => {
    // Simulate the race by pre-creating a valid config in the same path
    // BEFORE bootstrapWallet's atomic open(wx) — wx would EEXIST, then
    // we re-read the winner's config rather than overwriting.
    const winnerKey = `0x${'b'.repeat(64)}` as const;
    const winnerConfig = {
      sessionKey: winnerKey,
      rpcUrl: 'https://winner.example',
      chainId: 5000,
      agentId: null,
      createdAt: '2026-06-13T11:00:00Z',
    };
    // Use bootstrap to create the dir + write a different config.
    bootstrapWallet({ configPath });
    writeFileSync(configPath, JSON.stringify(winnerConfig), { mode: 0o600 });

    // Now a fresh bootstrapWallet call must return the WINNER's config,
    // never silently overwrite.
    const result = bootstrapWallet({ configPath });
    expect(result.sessionKey).toBe(winnerKey);
    expect(result.rpcUrl).toBe('https://winner.example');
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
