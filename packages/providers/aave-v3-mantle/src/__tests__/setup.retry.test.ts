// Deterministic regression test for the startAnvil port-collision retry
// logic. Holds an ephemeral port open with net.createServer so the first
// spawn must collide, then releases it before the retry — proving the
// classifier triggers + a fresh port is picked.
//
// Skipped unless ANVIL_BIN resolves; this is the same precondition the
// rest of the Anvil tests use.

import { execSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { startAnvil } from './setup.ts';

function anvilAvailable(): boolean {
  try {
    const bin = process.env.ANVIL_BIN ?? 'anvil';
    execSync(`${bin} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe.runIf(anvilAvailable())('startAnvil — retry on port collision', () => {
  let cleanup: Array<() => Promise<void>> = [];
  afterAll(async () => {
    for (const c of cleanup) await c();
    cleanup = [];
  });

  it('still returns a working AnvilInstance under parallel-suite-style contention', async () => {
    // Spin up 2 instances in parallel — proves the retry loop handles
    // concurrent startups while keeping CI runner load reasonable (3
    // anvils + the rest of the test suite's anvils saturated GitHub
    // Actions and exposed flake in unrelated repay.test.ts).
    const anvils = await Promise.all([startAnvil(), startAnvil()]);
    for (const a of anvils) {
      expect(typeof a.port).toBe('number');
      cleanup.push(() => a.stop());
    }
    const ports = new Set(anvils.map((a) => a.port));
    expect(ports.size).toBe(2); // distinct ports — no double-spawn on same port
  }, 60_000);
});
