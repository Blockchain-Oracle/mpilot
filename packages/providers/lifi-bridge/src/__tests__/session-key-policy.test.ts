import { describe, expect, it } from 'vitest';
import { LIFI_DIAMOND } from '../_context.ts';
import { BRIDGE_FUNCTION_SELECTORS, buildCallPolicy, callPolicy } from '../sessionKey.ts';

describe('callPolicy — restrictive session key policy (test_sessionKey_PolicyRestrictive)', () => {
  it('targets exactly one contract — the Li.Fi Diamond', () => {
    expect(callPolicy.targets.length).toBe(1);
    expect(callPolicy.targets[0].toLowerCase()).toBe(LIFI_DIAMOND.toLowerCase());
  });

  it('selectors are non-empty and each is a valid 4-byte hex string (NOT wildcard)', () => {
    expect(callPolicy.selectors.length).toBeGreaterThanOrEqual(1);
    for (const sel of callPolicy.selectors) {
      // 4-byte selector = 0x + 8 hex chars = 10 chars total
      expect(sel).toMatch(/^0x[0-9a-fA-F]{8}$/);
      // Not the zero selector (wildcard guard)
      expect(sel).not.toBe('0x00000000');
    }
  });

  it('BRIDGE_FUNCTION_SELECTORS contains at least the Across and Stargate bridge selectors', () => {
    expect(BRIDGE_FUNCTION_SELECTORS.length).toBeGreaterThanOrEqual(4);
    // All are unique
    const unique = new Set(BRIDGE_FUNCTION_SELECTORS);
    expect(unique.size).toBe(BRIDGE_FUNCTION_SELECTORS.length);
  });
});

describe('buildCallPolicy — dynamic policy from route calldata', () => {
  it('extracts selector from calldata and returns single-selector policy for lifiDiamond', () => {
    const calldata =
      '0x3d0a87400000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`;
    const policy = buildCallPolicy(calldata);
    expect(policy.targets.length).toBe(1);
    expect(policy.targets[0].toLowerCase()).toBe(LIFI_DIAMOND.toLowerCase());
    expect(policy.selectors.length).toBe(1);
    expect(policy.selectors[0]).toBe('0x3d0a8740');
  });

  it('throws when calldata is too short to contain a selector', () => {
    expect(() => buildCallPolicy('0x123' as `0x${string}`)).toThrow();
  });
});
