import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTickConfig } from './setup.ts';

afterEach(() => vi.restoreAllMocks());

describe('e2e FullTick — 5 phases compose in order producing an attestation', () => {
  it('plan → simulate → propose → execute → record → kind:"completed" with attestationUid', async () => {
    const { run, fakes, config } = buildTickConfig();
    const result = await run();
    expect(result.kind).toBe('completed');
    if (result.kind !== 'completed') throw new Error('expected completed');
    expect(result.attestation.attestationUid).toMatch(/^0x[a-f0-9]{64}$/i);
    expect(fakes.executions).toHaveLength(1);
    expect(fakes.executions[0]?.attestationUid).toBe(result.attestation.attestationUid);
    expect(fakes.attestationsAttempted).toHaveLength(1);

    // Phase ordering: each phase mock called exactly once.
    expect(config.plan).toHaveBeenCalledTimes(1);
    expect(config.simulate).toHaveBeenCalledTimes(1);
    expect(config.propose).toHaveBeenCalledTimes(1);
    expect(config.execute).toHaveBeenCalledTimes(1);
    expect(config.record).toHaveBeenCalledTimes(1);
  });

  it('lock is released after a successful tick (no orphaned hold)', async () => {
    const { run, fakes } = buildTickConfig();
    await run();
    expect(fakes.lockHolders.size).toBe(0);
  });
});
