/**
 * Story-138 — Elicitation form + URL modes + threshold gate + capability fallback.
 */
import { ConciergeError } from '@concierge-mantle/sdk';
import type { ElicitResult } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_HIGH_VALUE_USD,
  type ElicitationCapability,
  type ElicitFn,
  readHighValueThresholdUsd,
  requestFormConfirmation,
  requestUrlElicitation,
} from '../elicitation.ts';
import { importSessionKeyViaElicitation, type PollFn } from '../wallet-import-flow.ts';

const SUPPORTED: ElicitationCapability = { supported: true };
const UNSUPPORTED: ElicitationCapability = { supported: false };

function mkElicit(result: ElicitResult): ElicitFn {
  return vi.fn().mockResolvedValue(result);
}

describe('readHighValueThresholdUsd', () => {
  it('returns DEFAULT_HIGH_VALUE_USD when env var is unset', () => {
    expect(readHighValueThresholdUsd({})).toBe(DEFAULT_HIGH_VALUE_USD);
  });

  it('reads CONCIERGE_CONFIRM_THRESHOLD_USD as a number when valid', () => {
    expect(readHighValueThresholdUsd({ CONCIERGE_CONFIRM_THRESHOLD_USD: '5000' })).toBe(5000);
  });

  it('throws ConfigError on non-numeric env value', () => {
    expect(() => readHighValueThresholdUsd({ CONCIERGE_CONFIRM_THRESHOLD_USD: 'abc' })).toThrow(
      /non-negative/,
    );
  });

  it('throws ConfigError on negative env value', () => {
    expect(() => readHighValueThresholdUsd({ CONCIERGE_CONFIRM_THRESHOLD_USD: '-1' })).toThrow(
      /non-negative/,
    );
  });
});

describe('requestFormConfirmation — threshold + form-mode behaviour', () => {
  it('SKIPS elicitation when notionalUsd ≤ threshold (no-op below-threshold path)', async () => {
    const elicit = vi.fn();
    const out = await requestFormConfirmation({
      elicit,
      capability: SUPPORTED,
      actionSummary: 'tiny supply',
      notionalUsd: 50,
      threshold: 1000,
    });
    expect(out).toEqual({ confirmed: true, maxSlippageBps: 50, elicited: false });
    expect(elicit).not.toHaveBeenCalled();
  });

  it('THROWS ConfigError when over threshold AND client lacks elicitation capability', async () => {
    await expect(
      requestFormConfirmation({
        elicit: vi.fn(),
        capability: UNSUPPORTED,
        actionSummary: 'big supply',
        notionalUsd: 5000,
        threshold: 1000,
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConciergeError &&
        e.type === 'ConfigError' &&
        (e.metadata as { capability?: string } | undefined)?.capability === 'missing',
    );
  });

  it('returns user-chosen slippage when client accepts with confirm=true', async () => {
    const elicit = mkElicit({
      action: 'accept',
      content: { confirm: true, maxSlippageBps: 80, justification: 'large supply rebalance' },
    });
    const out = await requestFormConfirmation({
      elicit,
      capability: SUPPORTED,
      actionSummary: 'Supply 10000 USDC → Aave V3',
      notionalUsd: 10000,
      threshold: 1000,
    });
    expect(out).toEqual({
      confirmed: true,
      maxSlippageBps: 80,
      elicited: true,
      justification: 'large supply rebalance',
    });
    // The form was actually prompted to the host
    expect(elicit).toHaveBeenCalledTimes(1);
    const params = (elicit as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(params?.mode).toBe('form');
    expect(params?.requestedSchema?.required).toContain('confirm');
  });

  it('THROWS UserRejected when user declines the form', async () => {
    const elicit = mkElicit({ action: 'decline' });
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
        e.type === 'UserRejected' &&
        (e.metadata as { action?: string } | undefined)?.action === 'decline',
    );
  });

  it('THROWS UserRejected when user cancels the form', async () => {
    const elicit = mkElicit({ action: 'cancel' });
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
        e.type === 'UserRejected' &&
        (e.metadata as { action?: string } | undefined)?.action === 'cancel',
    );
  });

  it('THROWS UserRejected when user accepts BUT leaves the confirm checkbox unchecked', async () => {
    const elicit = mkElicit({ action: 'accept', content: { confirm: false, maxSlippageBps: 50 } });
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
        e.type === 'UserRejected' &&
        (e.metadata as { action?: string } | undefined)?.action === 'accept-no-confirm',
    );
  });

  it('falls back to default slippage when client omits maxSlippageBps in accept content', async () => {
    const elicit = mkElicit({ action: 'accept', content: { confirm: true } });
    const out = await requestFormConfirmation({
      elicit,
      capability: SUPPORTED,
      actionSummary: 'borrow',
      notionalUsd: 5000,
      threshold: 1000,
      defaultMaxSlippageBps: 25,
    });
    expect(out.maxSlippageBps).toBe(25);
    expect(out.elicited).toBe(true);
  });
});

describe('requestUrlElicitation — SEP-1036 URL handoff', () => {
  it('passes through mode=url + url + message + elicitationId; returns on accept', async () => {
    const elicit = mkElicit({ action: 'accept' });
    await requestUrlElicitation({
      elicit,
      capability: SUPPORTED,
      url: 'https://concierge.xyz/auth/import?token=abc',
      message: 'Sign in your browser',
      elicitationId: 'fixed-id-1',
    });
    const params = (elicit as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(params).toMatchObject({
      mode: 'url',
      url: 'https://concierge.xyz/auth/import?token=abc',
      message: 'Sign in your browser',
      elicitationId: 'fixed-id-1',
    });
  });

  it('THROWS UserRejected on cancel/decline', async () => {
    for (const action of ['cancel', 'decline'] as const) {
      const elicit = mkElicit({ action });
      await expect(
        requestUrlElicitation({
          elicit,
          capability: SUPPORTED,
          url: 'https://x.example',
          message: 'go',
        }),
      ).rejects.toSatisfy((e: unknown) => e instanceof ConciergeError && e.type === 'UserRejected');
    }
  });

  it('THROWS ConfigError when capability is missing', async () => {
    await expect(
      requestUrlElicitation({
        elicit: vi.fn(),
        capability: UNSUPPORTED,
        url: 'https://x.example',
        message: 'go',
      }),
    ).rejects.toSatisfy((e: unknown) => e instanceof ConciergeError && e.type === 'ConfigError');
  });

  it('REJECTS non-http(s) URL schemes (CWE-601: open-redirect / phishing)', async () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,evil', 'file:///etc/passwd']) {
      await expect(
        requestUrlElicitation({
          elicit: vi.fn(),
          capability: SUPPORTED,
          url,
          message: 'go',
        }),
      ).rejects.toSatisfy(
        (e: unknown) =>
          e instanceof ConciergeError && e.type === 'ConfigError' && /scheme/.test(e.message),
      );
    }
  });

  it('REJECTS http:// to non-loopback hosts (https-only for remote)', async () => {
    await expect(
      requestUrlElicitation({
        elicit: vi.fn(),
        capability: SUPPORTED,
        url: 'http://attacker.example/phish',
        message: 'go',
      }),
    ).rejects.toSatisfy((e: unknown) => e instanceof ConciergeError && e.type === 'ConfigError');
  });

  it('ALLOWS http://localhost for dev', async () => {
    const elicit = mkElicit({ action: 'accept' });
    await expect(
      requestUrlElicitation({
        elicit,
        capability: SUPPORTED,
        url: 'http://localhost:3000/auth/import',
        message: 'go',
      }),
    ).resolves.toBeUndefined();
  });

  it('THROWS UserRejected with metadata.action distinguishing cancel vs decline', async () => {
    for (const action of ['cancel', 'decline'] as const) {
      const elicit = mkElicit({ action });
      await expect(
        requestUrlElicitation({
          elicit,
          capability: SUPPORTED,
          url: 'https://x.example',
          message: 'go',
        }),
      ).rejects.toSatisfy(
        (e: unknown) =>
          e instanceof ConciergeError &&
          e.type === 'UserRejected' &&
          (e.metadata as { action?: string } | undefined)?.action === action,
      );
    }
  });
});

describe('importSessionKeyViaElicitation — URL handoff + polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the imported session key when poll succeeds after a few attempts', async () => {
    const elicit = mkElicit({ action: 'accept' });
    let calls = 0;
    const poll: PollFn = async () => {
      calls += 1;
      if (calls < 3) return null;
      return {
        sessionKeyAddress: '0x1111111111111111111111111111111111111111',
        importedAt: '2026-06-14T17:00:00Z',
      };
    };
    const p = importSessionKeyViaElicitation({
      elicit,
      capability: SUPPORTED,
      oneTimeToken: 'tok-xyz',
      poll,
      timeoutSeconds: 30,
    });
    // Advance fake timers to let the polling loop run
    await vi.advanceTimersByTimeAsync(2100);
    await vi.advanceTimersByTimeAsync(2100);
    await vi.advanceTimersByTimeAsync(2100);
    const out = await p;
    expect(out.sessionKeyAddress).toBe('0x1111111111111111111111111111111111111111');
    expect(calls).toBeGreaterThanOrEqual(3);
    const params = (elicit as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(params?.url).toContain('token=tok-xyz');
  });

  it('THROWS RpcError(kind=timeout) when the poll deadline expires without a key', async () => {
    // Use real timers — fake timers + an unhandled rejection chase race here
    // and aren't worth the test-side complexity. Use a 1s deadline.
    vi.useRealTimers();
    const elicit = mkElicit({ action: 'accept' });
    const poll: PollFn = async () => null;
    await expect(
      importSessionKeyViaElicitation({
        elicit,
        capability: SUPPORTED,
        oneTimeToken: 'tok-xyz',
        poll,
        timeoutSeconds: 1,
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConciergeError &&
        e.type === 'RpcError' &&
        (e.metadata as { kind?: string } | undefined)?.kind === 'timeout',
    );
  });
});
