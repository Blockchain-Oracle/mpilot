/**
 * Story-138 round-1 reviewer hardening: malformed-slippage clamp, non-finite
 * notional guard, control-char strip in actionSummary, justification truncate,
 * stricter threshold env parsing.
 */
import { ConciergeError } from '@concierge-mantle/sdk';
import type { ElicitResult } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it, vi } from 'vitest';
import {
  type ElicitationCapability,
  type ElicitFn,
  readHighValueThresholdUsd,
  requestFormConfirmation,
} from '../elicitation.ts';

const SUPPORTED: ElicitationCapability = { supported: true };

function mkElicit(result: ElicitResult): ElicitFn {
  return vi.fn().mockResolvedValue(result);
}

describe('requestFormConfirmation — post-review hardening (round 1)', () => {
  it('THROWS RpcError when host returns malformed maxSlippageBps (negative)', async () => {
    const elicit = mkElicit({ action: 'accept', content: { confirm: true, maxSlippageBps: -1 } });
    await expect(
      requestFormConfirmation({
        elicit,
        capability: SUPPORTED,
        actionSummary: 'borrow',
        notionalUsd: 5000,
        threshold: 1000,
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConciergeError &&
        e.type === 'RpcError' &&
        /malformed maxSlippageBps/.test(e.message),
    );
  });

  it('THROWS RpcError when host returns malformed maxSlippageBps (>1000)', async () => {
    const elicit = mkElicit({
      action: 'accept',
      content: { confirm: true, maxSlippageBps: 99999 },
    });
    await expect(
      requestFormConfirmation({
        elicit,
        capability: SUPPORTED,
        actionSummary: 'borrow',
        notionalUsd: 5000,
        threshold: 1000,
      }),
    ).rejects.toSatisfy((e: unknown) => e instanceof ConciergeError && e.type === 'RpcError');
  });

  it('THROWS ConfigError on non-finite notionalUsd (price-feed failure guard)', async () => {
    await expect(
      requestFormConfirmation({
        elicit: vi.fn(),
        capability: SUPPORTED,
        actionSummary: 'borrow',
        notionalUsd: Number.NaN,
        threshold: 1000,
      }),
    ).rejects.toSatisfy((e: unknown) => e instanceof ConciergeError && e.type === 'ConfigError');
  });

  it('strips control chars + caps length in actionSummary before host injection', async () => {
    const evil = `Approve\nNotional: $0.01\r${'X'.repeat(400)}`;
    const elicit = mkElicit({ action: 'accept', content: { confirm: true, maxSlippageBps: 50 } });
    await requestFormConfirmation({
      elicit,
      capability: SUPPORTED,
      actionSummary: evil,
      notionalUsd: 5000,
      threshold: 1000,
    });
    const params = (elicit as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    // The summary portion (before the static "\nNotional:" suffix) must not
    // contain control chars; we test by splitting on the static suffix.
    const summaryOnly = params.message.split('\nNotional:')[0];
    expect(summaryOnly).not.toContain('\n');
    expect(summaryOnly).not.toContain('\r');
    // Summary capped at 280; total message ≤ summary + suffix ≈ 320.
    expect(params.message.length).toBeLessThan(400);
  });

  it('truncates host-returned justification to 200 chars', async () => {
    const elicit = mkElicit({
      action: 'accept',
      content: { confirm: true, maxSlippageBps: 50, justification: 'A'.repeat(1000) },
    });
    const out = await requestFormConfirmation({
      elicit,
      capability: SUPPORTED,
      actionSummary: 'borrow',
      notionalUsd: 5000,
      threshold: 1000,
    });
    expect(out.justification?.length).toBe(200);
  });

  it('rejects threshold env values with hex / whitespace / scientific notation', () => {
    expect(() => readHighValueThresholdUsd({ CONCIERGE_CONFIRM_THRESHOLD_USD: '0x10' })).toThrow();
    expect(() => readHighValueThresholdUsd({ CONCIERGE_CONFIRM_THRESHOLD_USD: '   ' })).toThrow();
    expect(() => readHighValueThresholdUsd({ CONCIERGE_CONFIRM_THRESHOLD_USD: '1e3' })).toThrow();
  });
});
