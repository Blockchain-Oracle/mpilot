import { ConciergeError } from '@concierge/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PinFeedbackResult } from '../pin.ts';
import { type PinReceiptRepository, recordPinReceipt } from '../pinReceipt.ts';
import { GOLDEN_AAVE_SUPPLY_HASH } from './__fixtures__/envelopes.ts';

afterEach(() => vi.restoreAllMocks());

const SUCCESS_RESULT: PinFeedbackResult = {
  cid: 'bafy-test-cid',
  canonical: '{"v":1}',
  hash: GOLDEN_AAVE_SUPPLY_HASH,
  primary: { service: 'pinata', ok: true, cid: 'bafy-test-cid', pinId: 'pinata:bafy-test-cid' },
  fallback: {
    service: 'web3.storage',
    ok: true,
    cid: 'bafy-test-cid',
    pinId: 'web3.storage:bafy-test-cid',
  },
};

const PARTIAL_RESULT: PinFeedbackResult = {
  cid: 'bafy-w3s-only',
  canonical: '{"v":1}',
  hash: GOLDEN_AAVE_SUPPLY_HASH,
  primary: { service: 'pinata', ok: false, error: 'pinata: 503' },
  fallback: {
    service: 'web3.storage',
    ok: true,
    cid: 'bafy-w3s-only',
    pinId: 'web3.storage:bafy-w3s-only',
  },
};

describe('recordPinReceipt', () => {
  it('happy path: both ok → row carries both pinIds, both ok=true', async () => {
    const inserted: unknown[] = [];
    const repo: PinReceiptRepository = {
      insert: vi.fn().mockImplementation(async (row) => {
        inserted.push(row);
        return { id: 'receipt-1' };
      }),
    };
    const out = await recordPinReceipt(
      { agentId: '1', result: SUCCESS_RESULT },
      { repository: repo },
    );
    expect(out.id).toBe('receipt-1');
    const row = inserted[0] as Record<string, unknown>;
    expect(row['cid']).toBe('bafy-test-cid');
    expect(row['primaryOk']).toBe(true);
    expect(row['fallbackOk']).toBe(true);
    expect(row['hash']).toBe(GOLDEN_AAVE_SUPPLY_HASH);
  });

  it('partial: primary failed → primaryError populated; primaryPinId null', async () => {
    const inserted: unknown[] = [];
    const repo: PinReceiptRepository = {
      insert: vi.fn().mockImplementation(async (row) => {
        inserted.push(row);
        return { id: 'receipt-2' };
      }),
    };
    await recordPinReceipt({ agentId: '1', result: PARTIAL_RESULT }, { repository: repo });
    const row = inserted[0] as Record<string, unknown>;
    expect(row['primaryOk']).toBe(false);
    expect(row['primaryError']).toContain('503');
    expect(row['primaryPinId']).toBeNull();
    expect(row['fallbackOk']).toBe(true);
  });

  it('insert throws → RpcError with cid + agentId + hash in metadata', async () => {
    const repo: PinReceiptRepository = {
      insert: vi.fn().mockRejectedValue(new Error('drizzle blew up')),
    };
    await expect(
      recordPinReceipt({ agentId: '1', result: SUCCESS_RESULT }, { repository: repo }),
    ).rejects.toSatisfy((e: unknown) => {
      if (!(e instanceof ConciergeError)) return false;
      const md = e.metadata as { cid?: string; agentId?: string; hash?: string } | undefined;
      return (
        e.type === 'RpcError' &&
        md?.cid === 'bafy-test-cid' &&
        md?.agentId === '1' &&
        md?.hash === GOLDEN_AAVE_SUPPLY_HASH
      );
    });
  });
});
