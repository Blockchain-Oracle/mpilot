import { ConciergeError } from '@concierge/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pinFeedback } from '../pin.ts';
import type { PinService } from '../pinService.ts';
import { AAVE_SUPPLY, GOLDEN_AAVE_SUPPLY_HASH } from './__fixtures__/envelopes.ts';

afterEach(() => vi.restoreAllMocks());

const PINATA_CID = 'bafy-pinata-1';
const W3S_CID = 'bafy-w3s-1';

function fakePinata(): PinService & { calls: number } {
  let calls = 0;
  return {
    name: 'pinata',
    get calls() {
      return calls;
    },
    async pin() {
      calls += 1;
      return { cid: PINATA_CID, pinId: `pinata:${PINATA_CID}` };
    },
  };
}

function fakeW3S(): PinService & { calls: number } {
  let calls = 0;
  return {
    name: 'web3.storage',
    get calls() {
      return calls;
    },
    async pin() {
      calls += 1;
      return { cid: W3S_CID, pinId: `web3.storage:${W3S_CID}` };
    },
  };
}

function failingPinata(msg: string): PinService {
  return {
    name: 'pinata',
    async pin() {
      throw new Error(msg);
    },
  };
}

function failingW3S(msg: string): PinService {
  return {
    name: 'web3.storage',
    async pin() {
      throw new Error(msg);
    },
  };
}

describe('pinFeedback — happy paths', () => {
  it('both services succeed → Pinata wins (primary); BOTH attempts marked ok (redundancy)', async () => {
    const pinata = fakePinata();
    const w3s = fakeW3S();
    const result = await pinFeedback(AAVE_SUPPLY, { primary: pinata, fallback: w3s });
    expect(result.cid).toBe(PINATA_CID);
    expect(result.hash).toBe(GOLDEN_AAVE_SUPPLY_HASH);
    expect(result.primary.ok).toBe(true);
    expect(result.fallback.ok).toBe(true);
    expect(result.primary.cid).toBe(PINATA_CID);
    expect(result.fallback.cid).toBe(W3S_CID);
    expect(pinata.calls).toBe(1);
    expect(w3s.calls).toBe(1); // redundancy: w3s ALSO ran, not skipped
  });

  it('Pinata 503 → web3.storage fallback CID wins; primary.ok=false', async () => {
    const out = await pinFeedback(AAVE_SUPPLY, {
      primary: failingPinata('pinata: 503 Service Unavailable'),
      fallback: fakeW3S(),
    });
    expect(out.cid).toBe(W3S_CID);
    expect(out.primary.ok).toBe(false);
    expect(out.primary.error).toContain('503');
    expect(out.fallback.ok).toBe(true);
  });

  it('returns canonical bytes AND hash matching the golden vector (pair from story-82)', async () => {
    const out = await pinFeedback(AAVE_SUPPLY, { primary: fakePinata(), fallback: fakeW3S() });
    expect(out.canonical).toContain('"agentId":"agent-1"');
    expect(out.hash).toBe(GOLDEN_AAVE_SUPPLY_HASH);
  });
});

describe('pinFeedback — degradation', () => {
  it('only Pinata configured + succeeds → fallback reports "not configured"', async () => {
    const out = await pinFeedback(AAVE_SUPPLY, { primary: fakePinata() });
    expect(out.cid).toBe(PINATA_CID);
    expect(out.primary.ok).toBe(true);
    expect(out.fallback.ok).toBe(false);
    expect(out.fallback.error).toBe('not configured');
  });

  it('only web3.storage configured + succeeds → primary reports "not configured"', async () => {
    const out = await pinFeedback(AAVE_SUPPLY, { fallback: fakeW3S() });
    expect(out.cid).toBe(W3S_CID);
    expect(out.fallback.ok).toBe(true);
    expect(out.primary.ok).toBe(false);
    expect(out.primary.error).toBe('not configured');
  });

  it('NEITHER configured → ConfigError at the boundary (no silent no-op)', async () => {
    await expect(pinFeedback(AAVE_SUPPLY, {})).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'ConfigError',
    );
  });
});

describe('pinFeedback — both fail', () => {
  it('Pinata 500 + web3.storage 500 → ConciergeError(IPFSPinFailed) with structured metadata', async () => {
    const logger = { warn: vi.fn(), error: vi.fn() };
    await expect(
      pinFeedback(AAVE_SUPPLY, {
        primary: failingPinata('pinata: 500 boom'),
        fallback: failingW3S('web3.storage: 500 boom'),
        logger,
      }),
    ).rejects.toSatisfy((e: unknown) => {
      if (!(e instanceof ConciergeError) || e.type !== 'IPFSPinFailed') return false;
      const md = e.metadata as
        | {
            primary?: { error?: string };
            fallback?: { error?: string };
            hash?: string;
            agentId?: string;
          }
        | undefined;
      return (
        md?.primary?.error?.includes('pinata') === true &&
        md?.fallback?.error?.includes('web3.storage') === true &&
        md?.hash === GOLDEN_AAVE_SUPPLY_HASH &&
        md?.agentId === 'agent-1'
      );
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});

describe('pinFeedback — logging', () => {
  it('primary failed + fallback succeeded → logger.warn fires with cid + error', async () => {
    const logger = { warn: vi.fn(), error: vi.fn() };
    await pinFeedback(AAVE_SUPPLY, {
      primary: failingPinata('pinata: 502 bad gw'),
      fallback: fakeW3S(),
      logger,
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const meta = logger.warn.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(meta?.['cid']).toBe(W3S_CID);
    expect(meta?.['primaryError']).toContain('502');
  });
});
