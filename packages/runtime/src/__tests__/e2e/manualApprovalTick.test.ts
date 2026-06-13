import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTickConfig } from './setup.ts';

afterEach(() => vi.restoreAllMocks());

describe('e2e ManualApprovalTick — propose stop:"awaiting_approval"; tick halts BEFORE execute', () => {
  it('large action → propose returns stop; execute + record NOT called; no executions row created', async () => {
    const { run, fakes, config } = buildTickConfig({
      proposeOutcome: { kind: 'stop', reason: 'awaiting_approval' },
    });
    const result = await run();
    expect(result.kind).toBe('stopped');
    if (result.kind === 'stopped') {
      expect(result.phase).toBe('propose');
      expect(result.reason).toBe('awaiting_approval');
    }
    expect(config.execute).not.toHaveBeenCalled();
    expect(config.record).not.toHaveBeenCalled();
    expect(fakes.executions).toHaveLength(0);
  });

  it('next tick after approval lands → execute + record run; executions + attestation produced', async () => {
    // Simulate the "user approved" follow-up tick: propose continues now.
    const { run, fakes, config } = buildTickConfig();
    const result = await run();
    expect(result.kind).toBe('completed');
    expect(config.execute).toHaveBeenCalledTimes(1);
    expect(config.record).toHaveBeenCalledTimes(1);
    expect(fakes.executions[0]?.attestationUid).toBeTruthy();
  });
});
