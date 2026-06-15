import { ConciergeError } from '@mpilot/sdk';
import type { EvmChainId } from '@mpilot/shared';
import { addressesFor, mantleMainnet, mantleSepolia } from '@mpilot/shared';
import type { PublicClient, WalletClient } from 'viem';
import { createPublicClient, http } from 'viem';
import type { WalletActionContext, WalletProviderMode } from './_context.ts';
import { createApproveErc20Tool } from './actions/approveErc20.ts';
import { createGetErc20BalanceTool } from './actions/getErc20Balance.ts';
import { createGetNativeBalanceTool } from './actions/getNativeBalance.ts';
import { createTransferErc20Tool } from './actions/transferErc20.ts';
import { createTransferNativeTool } from './actions/transferNative.ts';
import { createUnwrapNativeTool, createWrapNativeTool } from './actions/wrap.ts';

export interface WalletProviderOptions {
  /** `execute` (default) signs + sends; `propose` returns unsigned tx previews for client-side signing. */
  mode?: WalletProviderMode;
  chain?: 'mantle-mainnet' | 'mantle-sepolia';
  rpcUrl?: string;
  publicClient?: PublicClient;
  walletClient?: WalletClient;
}

export interface WalletProvider {
  readonly chainId: EvmChainId;
  readonly mode: WalletProviderMode;
  readonly actions: {
    readonly getNativeBalance: ReturnType<typeof createGetNativeBalanceTool>;
    readonly getErc20Balance: ReturnType<typeof createGetErc20BalanceTool>;
    readonly transferNative: ReturnType<typeof createTransferNativeTool>;
    readonly transferErc20: ReturnType<typeof createTransferErc20Tool>;
    readonly approveErc20: ReturnType<typeof createApproveErc20Tool>;
    readonly wrapNative: ReturnType<typeof createWrapNativeTool>;
    readonly unwrapNative: ReturnType<typeof createUnwrapNativeTool>;
  };
}

const MANTLE_CHAIN_IDS = new Set([5000, 5003]);

function resolveChainId(opts: WalletProviderOptions): EvmChainId {
  if (opts.chain === 'mantle-mainnet') return 5000;
  if (opts.chain === 'mantle-sepolia') return 5003;
  if (opts.rpcUrl?.toLowerCase().includes('sepolia')) return 5003;

  const pcId = opts.publicClient?.chain?.id;
  if (pcId !== undefined) {
    if (!MANTLE_CHAIN_IDS.has(pcId)) {
      throw new ConciergeError(
        'NetworkUnsupported',
        `[@mpilot/wallet] publicClient chain id ${pcId} is not Mantle (5000 mainnet, 5003 sepolia).`,
      );
    }
    return pcId as EvmChainId;
  }
  const wcId = opts.walletClient?.chain?.id;
  if (wcId !== undefined) {
    if (!MANTLE_CHAIN_IDS.has(wcId)) {
      throw new ConciergeError(
        'NetworkUnsupported',
        `[@mpilot/wallet] walletClient chain id ${wcId} is not Mantle (5000 mainnet, 5003 sepolia).`,
      );
    }
    return wcId as EvmChainId;
  }
  return 5000;
}

export function createWalletProvider(opts: WalletProviderOptions = {}): WalletProvider {
  const chainId = resolveChainId(opts);
  const viemChain = chainId === 5003 ? mantleSepolia : mantleMainnet;
  const mode: WalletProviderMode = opts.mode ?? 'execute';

  const publicClient: PublicClient =
    opts.publicClient ??
    createPublicClient({
      chain: viemChain,
      transport: http(
        opts.rpcUrl ??
          (chainId === 5003 ? 'https://rpc.sepolia.mantle.xyz' : 'https://rpc.mantle.xyz'),
      ),
    });

  const ctx: WalletActionContext = {
    publicClient,
    ...(opts.walletClient !== undefined && { walletClient: opts.walletClient }),
    chainId,
    mode,
    addresses: { wrappedNative: addressesFor(chainId).tokens.WMNT },
  };

  return Object.freeze({
    chainId,
    mode,
    actions: Object.freeze({
      getNativeBalance: createGetNativeBalanceTool(ctx),
      getErc20Balance: createGetErc20BalanceTool(ctx),
      transferNative: createTransferNativeTool(ctx),
      transferErc20: createTransferErc20Tool(ctx),
      approveErc20: createApproveErc20Tool(ctx),
      wrapNative: createWrapNativeTool(ctx),
      unwrapNative: createUnwrapNativeTool(ctx),
    }),
  });
}
