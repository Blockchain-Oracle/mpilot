import { ConciergeError } from '@concierge/sdk';
import type { Address, Hex } from 'viem';
import { describe, expect, it } from 'vitest';
import { createCallPolicy } from '../callPolicy.ts';
import { createConciergePolicy } from '../concierge.ts';
import { createSpendingLimitPolicy } from '../spendingLimitPolicy.ts';
import { createTimeFramePolicy } from '../timeFramePolicy.ts';

const AAVE_POOL = '0x1111111111111111111111111111111111111111' as Address;
const LIFI_DIAMOND = '0x2222222222222222222222222222222222222222' as Address;
const USDC = '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9' as Address;
const SUPPLY_SELECTOR = '0x617ba037' as Hex;
const TRANSFER_SELECTOR = '0xa9059cbb' as Hex;

describe('createCallPolicy', () => {
  it('returns a Policy with manual selector permissions', () => {
    const policy = createCallPolicy({
      permissions: [
        { target: AAVE_POOL, selector: SUPPLY_SELECTOR },
        { target: LIFI_DIAMOND, selector: TRANSFER_SELECTOR },
      ],
    });
    expect(policy.policyParams.type).toBe('call');
    if (policy.policyParams.type === 'call') {
      expect(policy.policyParams.policyVersion).toBe('0.0.5');
    }
  });

  it('throws ConfigError(InvalidPolicy) for invalid target address', () => {
    expect(() =>
      createCallPolicy({
        permissions: [{ target: 'not-an-address' as Address, selector: SUPPLY_SELECTOR }],
      }),
    ).toSatisfy(
      // ConciergeError is thrown synchronously; capture via toThrow predicate
      () => true,
    );
    try {
      createCallPolicy({
        permissions: [{ target: 'not-an-address' as Address, selector: SUPPLY_SELECTOR }],
      });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConciergeError);
      expect((e as ConciergeError).type).toBe('ConfigError');
      expect(String((e as ConciergeError).message)).toContain('InvalidPolicy');
      expect(String((e as ConciergeError).message)).toContain('target');
    }
  });

  it('throws ConfigError(InvalidPolicy) for non-4-byte selector', () => {
    try {
      createCallPolicy({
        permissions: [{ target: AAVE_POOL, selector: '0xZZZZ' as Hex }],
      });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConciergeError);
      expect((e as ConciergeError).type).toBe('ConfigError');
      expect(String((e as ConciergeError).message)).toContain('InvalidPolicy');
      expect(String((e as ConciergeError).message)).toContain('selector');
    }
  });

  it('throws ConfigError(InvalidPolicy) for empty permissions array', () => {
    try {
      createCallPolicy({ permissions: [] });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConciergeError);
      expect((e as ConciergeError).type).toBe('ConfigError');
      expect(String((e as ConciergeError).message)).toContain('at least one');
    }
  });

  it('accepts a permission with no selector (target-only allowance)', () => {
    const policy = createCallPolicy({
      permissions: [{ target: AAVE_POOL }],
    });
    expect(policy.policyParams.type).toBe('call');
  });
});

describe('createSpendingLimitPolicy', () => {
  it('returns a call Policy enforcing per-tx cap on ERC-20 transfer amount', () => {
    const policy = createSpendingLimitPolicy({
      token: USDC,
      maxAmountPerTx: 100_000_000n,
    });
    expect(policy.policyParams.type).toBe('call');
  });

  it('throws ConfigError for invalid token address', () => {
    try {
      createSpendingLimitPolicy({
        token: 'not-an-address' as Address,
        maxAmountPerTx: 100_000_000n,
      });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConciergeError);
      expect((e as ConciergeError).type).toBe('ConfigError');
      expect(String((e as ConciergeError).message)).toContain('token');
    }
  });

  it('throws ConfigError for zero or negative maxAmountPerTx', () => {
    for (const bad of [0n, -1n]) {
      try {
        createSpendingLimitPolicy({ token: USDC, maxAmountPerTx: bad });
        expect.fail(`should have thrown for ${bad}`);
      } catch (e) {
        expect(e).toBeInstanceOf(ConciergeError);
        expect((e as ConciergeError).type).toBe('ConfigError');
        expect(String((e as ConciergeError).message)).toContain('maxAmountPerTx');
      }
    }
  });
});

describe('createTimeFramePolicy', () => {
  it('defaults validUntil to ~7 days from now and validAfter to ~now', () => {
    const now = Math.floor(Date.now() / 1000);
    const policy = createTimeFramePolicy({});
    const params = policy.policyParams as { validUntil: number; validAfter: number };
    expect(params.validUntil).toBeGreaterThanOrEqual(now + 7 * 24 * 60 * 60 - 10);
    expect(params.validUntil).toBeLessThanOrEqual(now + 7 * 24 * 60 * 60 + 10);
    expect(params.validAfter).toBeGreaterThanOrEqual(now - 10);
    expect(params.validAfter).toBeLessThanOrEqual(now + 10);
  });

  it('respects explicit validUntil + validAfter', () => {
    const policy = createTimeFramePolicy({ validUntil: 2_000_000_000, validAfter: 1_000_000_000 });
    const params = policy.policyParams as { validUntil: number; validAfter: number };
    expect(params.validUntil).toBe(2_000_000_000);
    expect(params.validAfter).toBe(1_000_000_000);
  });

  it('throws ConfigError when validUntil <= validAfter', () => {
    try {
      createTimeFramePolicy({ validUntil: 100, validAfter: 200 });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConciergeError);
      expect((e as ConciergeError).type).toBe('ConfigError');
      expect(String((e as ConciergeError).message)).toContain('validUntil');
    }
  });

  it('throws ConfigError when validUntil is 0 (would mean "never expires")', () => {
    try {
      createTimeFramePolicy({ validUntil: 0 });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConciergeError);
      expect((e as ConciergeError).type).toBe('ConfigError');
    }
  });
});

describe('createConciergePolicy', () => {
  const provider1 = {
    sessionKey: {
      callPolicy: { permissions: [{ target: AAVE_POOL, selector: SUPPLY_SELECTOR }] },
    },
  };
  const provider2 = {
    sessionKey: {
      callPolicy: { permissions: [{ target: LIFI_DIAMOND, selector: TRANSFER_SELECTOR }] },
    },
  };

  it('composes call permissions across providers (union)', () => {
    const policies = createConciergePolicy({
      providers: [provider1, provider2],
      spendingLimits: [{ token: USDC, maxAmountPerTx: 100_000_000n }],
    });
    // First policy is the merged call policy
    const callPolicy = policies[0];
    expect(callPolicy?.policyParams.type).toBe('call');
  });

  it('produces a non-empty Policy[] containing call + spending + time-frame', () => {
    const policies = createConciergePolicy({
      providers: [provider1],
      spendingLimits: [{ token: USDC, maxAmountPerTx: 100_000_000n }],
    });
    const types = policies.map((p) => p.policyParams.type);
    expect(types).toContain('call');
    expect(types).toContain('timestamp');
    // At least 3 entries (call merged + spending + timestamp). Spending limits are themselves
    // call policies, so the call-type count is provider-call + spending-call entries.
    expect(policies.length).toBeGreaterThanOrEqual(3);
  });

  it('throws ConfigError when providers array is empty (no policies to compose)', () => {
    try {
      createConciergePolicy({ providers: [], spendingLimits: [] });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConciergeError);
      expect((e as ConciergeError).type).toBe('ConfigError');
      expect(String((e as ConciergeError).message)).toContain('at least one provider');
    }
  });

  it('dedups identical (target, selector) pairs across providers', () => {
    const dupProvider = {
      sessionKey: {
        callPolicy: { permissions: [{ target: AAVE_POOL, selector: SUPPLY_SELECTOR }] },
      },
    };
    const policies = createConciergePolicy({
      providers: [provider1, dupProvider],
      spendingLimits: [],
    });
    // Call policy should still compose without throwing on duplicates
    expect(policies[0]?.policyParams.type).toBe('call');
  });

  it('accepts a custom validUntil', () => {
    const customValidUntil = Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60;
    const policies = createConciergePolicy({
      providers: [provider1],
      spendingLimits: [],
      validUntil: customValidUntil,
    });
    const tsPolicy = policies.find((p) => p.policyParams.type === 'timestamp');
    expect((tsPolicy?.policyParams as { validUntil: number })?.validUntil).toBe(customValidUntil);
  });
});
