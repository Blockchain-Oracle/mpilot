import { ADDRESSES } from '@concierge/shared';
import type { ConciergeAgentLike } from '@concierge/tools';

type MainnetAddresses = typeof ADDRESSES.mantleMainnet;
type SepoliaAddresses = typeof ADDRESSES.mantleSepolia;

/**
 * Bundled Mantle address registry per story-22 / ADR-019's quickstart:
 * `createConcierge({ registry: ConciergeRegistry.mainnet() })`. The
 * `addresses` field is the SAME frozen object `@concierge/shared` exports —
 * by reference, never a copy — so there is exactly one source of truth and
 * mutation is impossible (shared deep-freezes it; instances freeze too).
 *
 * Implements `ConciergeAgentLike`, so a registry can be handed directly to
 * `createConciergeTools` / any adapter factory as the agent context.
 *
 * Sepolia note: non-ERC-8004 Sepolia addresses are zero placeholders until
 * story-192's mock deploy lands — see `@concierge/shared/addresses.ts`.
 */
export class ConciergeRegistry implements ConciergeAgentLike {
  private constructor(
    public readonly chainId: 5000 | 5003,
    public readonly addresses: MainnetAddresses | SepoliaAddresses,
  ) {
    Object.freeze(this);
  }

  static mainnet(): ConciergeRegistry {
    return new ConciergeRegistry(5000, ADDRESSES.mantleMainnet);
  }

  static sepolia(): ConciergeRegistry {
    return new ConciergeRegistry(5003, ADDRESSES.mantleSepolia);
  }
}
