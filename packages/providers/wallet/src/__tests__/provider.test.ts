import { ConciergeError } from '@mpilot/sdk';
import type { PublicClient } from 'viem';
import { describe, expect, it } from 'vitest';
import { createWalletProvider } from '../provider.ts';

const stubPublic = {} as unknown as PublicClient;

describe('createWalletProvider', () => {
  it('exposes the seven wallet actions', () => {
    const p = createWalletProvider({ chain: 'mantle-mainnet', publicClient: stubPublic });
    expect(Object.keys(p.actions).sort()).toEqual([
      'approveErc20',
      'getErc20Balance',
      'getNativeBalance',
      'transferErc20',
      'transferNative',
      'unwrapNative',
      'wrapNative',
    ]);
  });

  it('resolves chainId from the chain option', () => {
    expect(
      createWalletProvider({ chain: 'mantle-mainnet', publicClient: stubPublic }).chainId,
    ).toBe(5000);
    expect(
      createWalletProvider({ chain: 'mantle-sepolia', publicClient: stubPublic }).chainId,
    ).toBe(5003);
  });

  it('defaults to execute mode and a frozen object', () => {
    const p = createWalletProvider({ chain: 'mantle-mainnet', publicClient: stubPublic });
    expect(p.mode).toBe('execute');
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(p.actions)).toBe(true);
  });

  it('every action has name/description/inputSchema/outputSchema', () => {
    const p = createWalletProvider({ chain: 'mantle-sepolia', publicClient: stubPublic });
    for (const a of Object.values(p.actions)) {
      expect(typeof a.name).toBe('string');
      expect(typeof a.description).toBe('string');
      expect(a.inputSchema).toBeDefined();
      expect(a.outputSchema).toBeDefined();
    }
  });
});

describe('createWalletProvider — modes & networks', () => {
  it('propose mode write tools use the TxProposal outputSchema (kind=proposal)', () => {
    const p = createWalletProvider({
      mode: 'propose',
      chain: 'mantle-sepolia',
      publicClient: stubPublic,
    });
    expect(p.mode).toBe('propose');
    // The proposal schema accepts a `kind: 'proposal'` payload; the exec schema would not.
    const sample = {
      kind: 'proposal',
      to: '0x2222222222222222222222222222222222222222',
      value: '0',
      data: '0x',
      chainId: 5003,
      summary: 'x',
    };
    expect(p.actions.transferErc20.outputSchema.safeParse(sample).success).toBe(true);
    expect(
      p.actions.transferErc20.outputSchema.safeParse({ ...sample, kind: 'executed' }).success,
    ).toBe(false);
  });

  it('throws NetworkUnsupported for a non-Mantle publicClient chain', async () => {
    const { createPublicClient, http, defineChain } = await import('viem');
    const notMantle = defineChain({
      id: 1,
      name: 'Ethereum',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: ['https://eth.llamarpc.com'] } },
    });
    const pc = createPublicClient({ chain: notMantle, transport: http() });
    let caught: unknown;
    try {
      createWalletProvider({ publicClient: pc });
    } catch (e) {
      caught = e;
    }
    expect(caught).toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'NetworkUnsupported',
    );
  });
});
