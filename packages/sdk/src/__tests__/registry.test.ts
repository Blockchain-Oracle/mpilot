import { ADDRESSES } from '@concierge/shared';
import { type ConciergeAgentLike, createConciergeTools } from '@concierge/tools';
import { describe, expect, it } from 'vitest';
import { ConciergeRegistry } from '../registry.ts';

describe('ConciergeRegistry bundled-address factories', () => {
  it('mainnet() targets chain 5000 with the FROZEN shared mainnet addresses (same reference)', () => {
    const registry = ConciergeRegistry.mainnet();
    expect(registry.chainId).toBe(5000);
    // Identity, not deep-equality: @concierge/shared is the one source of
    // truth for addresses; a copy could drift from it.
    expect(registry.addresses).toBe(ADDRESSES.mantleMainnet);
  });

  it('sepolia() targets chain 5003 with the shared sepolia addresses (same reference)', () => {
    const registry = ConciergeRegistry.sepolia();
    expect(registry.chainId).toBe(5003);
    expect(registry.addresses).toBe(ADDRESSES.mantleSepolia);
  });

  it('instances are frozen — addresses routing cannot be mutated at runtime', () => {
    const registry = ConciergeRegistry.mainnet();
    expect(Object.isFrozen(registry)).toBe(true);
  });

  it('satisfies ConciergeAgentLike, so it plugs straight into the tools registry', () => {
    const registry: ConciergeAgentLike = ConciergeRegistry.mainnet();
    expect(createConciergeTools(registry)).toEqual([]);
  });
});
