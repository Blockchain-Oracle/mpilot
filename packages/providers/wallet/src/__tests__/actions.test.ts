import { ConciergeError } from '@mpilot/sdk';
import type { Address } from '@mpilot/shared';
import type { PublicClient, WalletClient } from 'viem';
import { describe, expect, it, vi } from 'vitest';
import type { TxProposal } from '../_schema.ts';
import type { ExecReceipt } from '../_write.ts';
import { createWalletProvider } from '../provider.ts';

const USER = '0x1111111111111111111111111111111111111111' as Address;
const RECIPIENT = '0x2222222222222222222222222222222222222222' as Address;
const TOKEN = '0x3333333333333333333333333333333333333333' as Address;
const SPENDER = '0x4444444444444444444444444444444444444444' as Address;
// ERC-20 transfer(address,uint256) selector / approve(address,uint256) selector / WETH9 deposit()/withdraw(uint256)
const SEL_TRANSFER = '0xa9059cbb';
const SEL_APPROVE = '0x095ea7b3';
const SEL_DEPOSIT = '0xd0e30db0';
const SEL_WITHDRAW = '0x2e1a7d4d';

function readStub(over: Partial<Record<string, unknown>> = {}): PublicClient {
  return {
    getBalance: vi.fn(async () => 123_456n),
    readContract: vi.fn(async ({ functionName }: { functionName: string }) => {
      if (functionName === 'balanceOf') return 1_000_000n;
      if (functionName === 'decimals') return 6;
      if (functionName === 'symbol') return 'USDC';
      throw new Error(`unexpected read ${functionName}`);
    }),
    ...over,
  } as unknown as PublicClient;
}

describe('read tools', () => {
  it('getNativeBalance returns wei string + MNT metadata', async () => {
    const p = createWalletProvider({ chain: 'mantle-mainnet', publicClient: readStub() });
    const out = await p.actions.getNativeBalance.invoke({ user: USER });
    expect(out).toEqual({ balance: '123456', decimals: 18, symbol: 'MNT' });
  });

  it('getErc20Balance returns balance + decimals + symbol', async () => {
    const p = createWalletProvider({ chain: 'mantle-mainnet', publicClient: readStub() });
    const out = await p.actions.getErc20Balance.invoke({ user: USER, token: TOKEN });
    expect(out).toEqual({ balance: '1000000', decimals: 6, symbol: 'USDC' });
  });

  it('wraps RPC failures in a ConciergeError', async () => {
    const failing = readStub({
      getBalance: vi.fn(async () => {
        throw new Error('rpc down');
      }),
    });
    const p = createWalletProvider({ chain: 'mantle-mainnet', publicClient: failing });
    await expect(p.actions.getNativeBalance.invoke({ user: USER })).rejects.toBeInstanceOf(
      ConciergeError,
    );
  });
});

describe('propose mode — encodes unsigned tx previews', () => {
  const p = createWalletProvider({
    mode: 'propose',
    chain: 'mantle-sepolia',
    publicClient: readStub(),
  });

  it('transferNative → plain value transfer, no data', async () => {
    const out = (await p.actions.transferNative.invoke({
      recipient: RECIPIENT,
      amount: '500',
    })) as TxProposal;
    expect(out.kind).toBe('proposal');
    expect(out.to).toBe(RECIPIENT);
    expect(out.value).toBe('500');
    expect(out.data).toBe('0x');
    expect(out.chainId).toBe(5003);
  });

  it('transferErc20 → token call with transfer selector, zero value', async () => {
    const out = (await p.actions.transferErc20.invoke({
      token: TOKEN,
      recipient: RECIPIENT,
      amount: '1000',
    })) as TxProposal;
    expect(out.to).toBe(TOKEN);
    expect(out.value).toBe('0');
    expect(out.data.startsWith(SEL_TRANSFER)).toBe(true);
  });

  it('approveErc20 → approve selector', async () => {
    const out = (await p.actions.approveErc20.invoke({
      token: TOKEN,
      spender: SPENDER,
      amount: '0',
    })) as TxProposal;
    expect(out.data.startsWith(SEL_APPROVE)).toBe(true);
  });

  it('wrapNative → WMNT deposit() with value', async () => {
    const out = (await p.actions.wrapNative.invoke({ amount: '777' })) as TxProposal;
    expect(out.value).toBe('777');
    expect(out.data).toBe(SEL_DEPOSIT);
    // sepolia WMNT
    expect(out.to.toLowerCase()).toBe('0xa26cf0e6b69da6dda8b62dd164b0ae1b57d296b8');
  });

  it('unwrapNative → WMNT withdraw(amount), zero value', async () => {
    const out = (await p.actions.unwrapNative.invoke({ amount: '777' })) as TxProposal;
    expect(out.value).toBe('0');
    expect(out.data.startsWith(SEL_WITHDRAW)).toBe(true);
  });
});

describe('execute mode — signs + sends', () => {
  function execClients() {
    const sendTransaction = vi.fn(async () => `0x${'a'.repeat(64)}`);
    const waitForTransactionReceipt = vi.fn(async () => ({ status: 'success', blockNumber: 7n }));
    const walletClient = {
      account: { address: USER },
      chain: { id: 5000 },
      sendTransaction,
    } as unknown as WalletClient;
    const publicClient = readStub({ waitForTransactionReceipt });
    return { walletClient, publicClient, sendTransaction, waitForTransactionReceipt };
  }

  it('transferNative sends and returns a receipt', async () => {
    const { walletClient, publicClient, sendTransaction } = execClients();
    const p = createWalletProvider({
      mode: 'execute',
      chain: 'mantle-mainnet',
      publicClient,
      walletClient,
    });
    const out = (await p.actions.transferNative.invoke({
      recipient: RECIPIENT,
      amount: '500',
    })) as ExecReceipt;
    expect(out.kind).toBe('executed');
    expect(out.txHash).toBe(`0x${'a'.repeat(64)}`);
    expect(out.from).toBe(USER);
    expect(out.blockNumber).toBe('7');
    expect(sendTransaction).toHaveBeenCalledOnce();
  });

  it('throws ConfigError in execute mode without a walletClient', async () => {
    const p = createWalletProvider({
      mode: 'execute',
      chain: 'mantle-mainnet',
      publicClient: readStub(),
    });
    await expect(
      p.actions.transferNative.invoke({ recipient: RECIPIENT, amount: '1' }),
    ).rejects.toMatchObject({ type: 'ConfigError' });
  });

  it('throws when the receipt is reverted', async () => {
    const { walletClient } = execClients();
    const publicClient = readStub({
      waitForTransactionReceipt: vi.fn(async () => ({ status: 'reverted', blockNumber: 8n })),
    });
    const p = createWalletProvider({
      mode: 'execute',
      chain: 'mantle-mainnet',
      publicClient,
      walletClient,
    });
    await expect(
      p.actions.transferErc20.invoke({ token: TOKEN, recipient: RECIPIENT, amount: '5' }),
    ).rejects.toBeInstanceOf(ConciergeError);
  });
});
