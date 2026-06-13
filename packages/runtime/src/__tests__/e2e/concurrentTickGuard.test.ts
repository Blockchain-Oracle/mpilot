import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTickConfig, makeFakes } from './setup.ts';

afterEach(() => vi.restoreAllMocks());

describe('e2e ConcurrentTickGuard — Redis NX lock excludes the second tick', () => {
  it('two ticks for the same agentId in parallel → one completes, one returns kind:"skipped"', async () => {
    const fakes = makeFakes();
    const a = buildTickConfig({}, fakes);
    const b = buildTickConfig({}, fakes);
    const [resA, resB] = await Promise.all([a.run(), b.run()]);
    const kinds = [resA.kind, resB.kind].sort();
    // One winner, one skipped — order non-deterministic.
    expect(kinds).toEqual(['completed', 'skipped']);
    // Exactly ONE phase pipeline ran across both calls.
    expect(fakes.executions).toHaveLength(1);
    expect(fakes.attestationsAttempted).toHaveLength(1);
  });

  it('pre-held lock → tick returns kind:"skipped"; no phases invoked', async () => {
    const { run, fakes, config } = buildTickConfig({ preheldLock: true });
    const result = await run();
    expect(result.kind).toBe('skipped');
    expect(config.plan).not.toHaveBeenCalled();
    expect(fakes.executions).toHaveLength(0);
  });
});
