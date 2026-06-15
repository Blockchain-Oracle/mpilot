import type { ConciergeAgentLike } from '@mpilot/tools';
import { createConciergeTools } from '@mpilot/tools';
import { describe, expect, it } from 'vitest';
import { assembleProviders } from '../assembleProviders.ts';

const MAINNET: ConciergeAgentLike = { chainId: 5000 };
const SEPOLIA: ConciergeAgentLike = { chainId: 5003 };

describe('assembleProviders', () => {
  it('yields 8 factories on mainnet (incl. ondo + mETH)', () => {
    expect(assembleProviders({ chain: 'mantle-mainnet' })).toHaveLength(8);
  });

  it('yields 5 factories on sepolia (ethena + ondo + mETH are mainnet-only)', () => {
    expect(assembleProviders({ chain: 'mantle-sepolia' })).toHaveLength(5);
  });

  it('registers via the tool registry WITHOUT throwing on duplicate names (mainnet, execute)', () => {
    const factories = assembleProviders({ chain: 'mantle-mainnet' });
    const tools = createConciergeTools(MAINNET, factories);
    const names = tools.map((t) => t.name);

    // Every tool name is provider-prefixed (the namespaceTool guarantee).
    expect(names.every((n) => /^(wallet|dex|aave|ethena|ondo|meth|lifi|erc8004)_/.test(n))).toBe(
      true,
    );
    // No duplicate names survived (registry would have thrown, but assert anyway).
    expect(new Set(names).size).toBe(names.length);
    // A representative tool from each of the 8 providers is present.
    for (const expected of [
      'wallet_transferErc20',
      'dex_swap',
      'aave_supply',
      'ethena_wrapToSusde',
      'ondo_getBalance',
      'meth_acquire',
      'lifi_bridge',
      'erc8004_attestAction',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('propose mode: wallet writes become proposals; other providers expose reads only', () => {
    const factories = assembleProviders({ chain: 'mantle-mainnet', mode: 'propose' });
    const names = createConciergeTools(MAINNET, factories).map((t) => t.name);

    // Wallet write tools are kept (they emit unsigned previews in propose mode).
    expect(names).toContain('wallet_transferErc20');
    expect(names).toContain('wallet_getNativeBalance');
    // Read tools from other providers survive.
    expect(names).toContain('dex_quote');
    expect(names).toContain('meth_getBalance');
    // Write tools from other providers are filtered out (no server custody in chat).
    expect(names).not.toContain('dex_swap');
    expect(names).not.toContain('aave_supply');
    expect(names).not.toContain('ethena_wrapToSusde');
  });

  it('sepolia registers cleanly too', () => {
    const names = createConciergeTools(SEPOLIA, assembleProviders({ chain: 'mantle-sepolia' })).map(
      (t) => t.name,
    );
    expect(names).toContain('wallet_transferNative');
    expect(names.every((n) => /_/.test(n))).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });
});
