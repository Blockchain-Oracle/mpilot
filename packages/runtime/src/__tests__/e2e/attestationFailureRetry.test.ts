import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTickConfig, makeFakes } from './setup.ts';

afterEach(() => vi.restoreAllMocks());

describe('e2e AttestationFailureRetry — execute lands, record fails, retry succeeds', () => {
  it('first tick: record returns error → tick errored at phase=record; executions row exists without attestationUid', async () => {
    const fakes = makeFakes();
    const { run } = buildTickConfig(
      {
        recordOutcome: {
          kind: 'error',
          error: new Error('ReputationRegistry paused'),
          cause: 'returned',
        },
      },
      fakes,
    );
    const result = await run();
    expect(result.kind).toBe('errored');
    if (result.kind === 'errored') {
      expect(result.phase).toBe('record');
      expect(result.cause).toBe('returned');
    }
    expect(fakes.executions).toHaveLength(1);
    expect(fakes.executions[0]?.attestationUid).toBeNull();
    expect(fakes.attestationsAttempted).toHaveLength(0);
  });

  it('retry tick: record succeeds → executions row updated with attestationUid', async () => {
    // Carry over `fakes` from the first tick: real production would re-load
    // the executions row and pass it via state; here we just simulate the
    // updated outcome and confirm the row gets the uid attached.
    const fakes = makeFakes();
    fakes.executions.push({ proposalId: 'prop-1', attestationUid: null });
    const { run, config } = buildTickConfig({}, fakes);
    const result = await run();
    expect(result.kind).toBe('completed');
    // The fake `record` sets the LAST executions row's uid. The first tick's
    // row gets the new uid (idempotent attach simulated by ExecutionAttestation
    // Repository.attachAttestation in the real wiring).
    if (result.kind === 'completed') {
      const last = fakes.executions.at(-1);
      expect(last?.attestationUid).toBe(result.attestation.attestationUid);
    }
    expect(config.record).toHaveBeenCalledTimes(1);
  });
});
