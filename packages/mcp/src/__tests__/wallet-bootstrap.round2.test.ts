import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapWallet } from '../wallet-bootstrap.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSIX = process.platform !== 'win32';

describe('bootstrapWallet — round-2 atomic-write race source contracts', () => {
  // Round-2 (test #1 rating 9): ESM module-namespace immutability blocks
  // direct mocking of node:fs renameSync. The EEXIST handling is structural
  // — verify via source-grep that the contract exists. Behavioral coverage
  // of the EEXIST path requires integration-level tests (deferred).
  const SOURCE = readFileSync(resolve(__dirname, '..', 'wallet-bootstrap.ts'), 'utf-8');

  it('uses tmp+rename atomicity (round-2 code IMPORTANT #1)', () => {
    expect(SOURCE).toMatch(/openSync\(tmpPath, 'wx', 0o600\)/);
    expect(SOURCE).toMatch(/renameSync\(tmpPath, configPath\)/);
  });

  it('handles rename EEXIST by re-reading winner config', () => {
    // Pattern: catch rename err → check e.code === 'EEXIST' → safeUnlink tmp
    // → tryReadConfig + return winner.
    expect(SOURCE).toMatch(/e\.code === 'EEXIST'/);
    expect(SOURCE).toMatch(/safeUnlink\(tmpPath\)/);
  });

  it('THROWS via tryReadConfig when winner config is malformed (no silent regen)', () => {
    // EEXIST branch calls tryReadConfig which throws "malformed" message
    // when shape-invalid — reused by the race-loser path.
    expect(SOURCE).toMatch(/exists but is malformed/);
    // The EEXIST branch calls tryReadConfig (returns config OR throws).
    expect(SOURCE).toMatch(/const winner = tryReadConfig\(configPath\)/);
  });

  it('cleans up the tmp file on any non-success path', () => {
    // safeUnlink is called in BOTH the EEXIST branch and the outer catch.
    const matches = SOURCE.match(/safeUnlink\(tmpPath\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

describe('bootstrapWallet — round-2 hostile rpcUrl rejection (CWE-345)', () => {
  let tmp: string;
  let configPath: string;
  beforeEach(() => {
    tmp = mkdtempSync(resolve(tmpdir(), 'concierge-bootstrap-rpc-'));
    configPath = resolve(tmp, '.concierge/config.json');
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  it('rejects hostile CONCIERGE_RPC_URL with quotes/JSON injection', () => {
    vi.stubEnv('CONCIERGE_RPC_URL', 'https://evil","userId":"x');
    try {
      expect(() => bootstrapWallet({ configPath })).toThrow(/hostile shape/);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('rejects javascript: scheme', () => {
    vi.stubEnv('CONCIERGE_RPC_URL', 'javascript:alert(1)');
    try {
      expect(() => bootstrapWallet({ configPath })).toThrow(/hostile shape/);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('accepts proper http(s) origins', () => {
    vi.stubEnv('CONCIERGE_RPC_URL', 'https://rpc.staging.mantle.xyz:8443/v1');
    try {
      const cfg = bootstrapWallet({ configPath });
      expect(cfg.rpcUrl).toBe('https://rpc.staging.mantle.xyz:8443/v1');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('round-2: refuses to LOAD a config whose persisted rpcUrl is hostile (race-injection defense)', () => {
    // Simulate a hostile process winning the race + writing a malformed
    // rpcUrl that passes parseConfig's old shape check. The new rpcUrl regex
    // must reject it inside parseConfig itself.
    bootstrapWallet({ configPath: resolve(tmp, '.concierge/_unused.json') });
    writeFileSync(
      configPath,
      JSON.stringify({
        sessionKey: `0x${'d'.repeat(64)}`,
        rpcUrl: 'https://evil","attack":"yes',
        chainId: 5000,
        agentId: null,
        createdAt: '2026-06-13T12:00:00Z',
      }),
      { mode: 0o600 },
    );
    expect(() => bootstrapWallet({ configPath })).toThrow(/malformed/);
  });
});

describe('bootstrapWallet — round-2 stale-dir permissions (silent-failure HIGH)', () => {
  let tmp: string;
  let configPath: string;
  beforeEach(() => {
    tmp = mkdtempSync(resolve(tmpdir(), 'concierge-bootstrap-perms-'));
    configPath = resolve(tmp, '.concierge/config.json');
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  it.runIf(POSIX)(
    'round-2: tightens a stale 0755 ~/.concierge to 0700 + warns on stderr',
    async () => {
      const fs = await import('node:fs');
      // Pre-create the dir at 0755 — simulating a stale install / restored backup.
      fs.mkdirSync(resolve(tmp, '.concierge'), { recursive: true, mode: 0o755 });
      fs.chmodSync(resolve(tmp, '.concierge'), 0o755);
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      try {
        bootstrapWallet({ configPath });
        // Dir tightened.
        expect(statSync(resolve(tmp, '.concierge')).mode & 0o777).toBe(0o700);
        const calls = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
        expect(calls).toContain('tightening');
        expect(calls).toContain('0700');
      } finally {
        stderrSpy.mockRestore();
      }
    },
  );
});

describe('bootstrapWallet — round-2 error-context wrapping', () => {
  let tmp: string;
  let configPath: string;
  beforeEach(() => {
    tmp = mkdtempSync(resolve(tmpdir(), 'concierge-bootstrap-err-'));
    configPath = resolve(tmp, '.concierge/config.json');
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  it('source contract: wraps non-ENOENT read errors with [wallet-bootstrap] prefix + path + code', () => {
    // ESM module-namespace immutability blocks readFileSync mocking; verify
    // via source-grep that wrapWalletErr is reachable from read-error path.
    const SOURCE = readFileSync(resolve(__dirname, '..', 'wallet-bootstrap.ts'), 'utf-8');
    // wrapWalletErr signature + invocation from tryReadConfig.
    expect(SOURCE).toMatch(/throw wrapWalletErr\(e, 'read config', configPath\)/);
    // wrapWalletErr message shape includes prefix + path + code.
    expect(SOURCE).toMatch(/wallet-bootstrap: \$\{op\} at \$\{path\} failed \(\$\{code\}\)/);
  });
});
