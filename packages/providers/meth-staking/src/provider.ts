import { ConciergeError } from '@concierge-mantle/sdk';
import {
  addressesFor,
  type EvmChainId,
  mantleMainnet,
  ZERO_ADDRESS,
} from '@concierge-mantle/shared';
import { type Chain, createPublicClient, http, type PublicClient } from 'viem';
import type { ActionContext, DexProviderLike, MethAddresses } from './_context.ts';
import { createAcquireTool } from './actions/acquire.ts';
import { createGetBalanceTool } from './actions/getBalance.ts';
import { createGetExchangeRateTool } from './actions/getExchangeRate.ts';
import { createGetYieldRateTool } from './actions/getYieldRate.ts';
import { createGetUnwrapToWETHTool } from './actions/unwrapToWETH.ts';

// Agni mETH/WETH 500 bps pool — verified on-chain 2026-06-11.
// token0 = mETH (0xcDA86A272531e8640cD7F1a92c01839911B90bb0, 18 dec)
// token1 = WETH (0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111, 18 dec)
const MANTLE_AGNI_METH_WETH = '0x4f9E3683A523b66Da89d82BbA0a9CAA1C3243dF4' as const;

export type MethAddressOverrides = Partial<MethAddresses>;

export interface MethStakingProviderOpts {
  publicClient?: PublicClient | undefined;
  rpcUrl?: string | undefined;
  chain?: 'mantle-mainnet' | Chain | undefined;
  addresses?: MethAddressOverrides | undefined;
}

export interface MethStakingDeps {
  dexProvider: DexProviderLike;
}

export interface MethStakingProvider {
  readonly chainId: 5000;
  readonly actions: {
    readonly getBalance: ReturnType<typeof createGetBalanceTool>;
    readonly getExchangeRate: ReturnType<typeof createGetExchangeRateTool>;
    readonly getYieldRate: ReturnType<typeof createGetYieldRateTool>;
    readonly acquire: ReturnType<typeof createAcquireTool>;
    readonly getUnwrapToWETH: ReturnType<typeof createGetUnwrapToWETHTool>;
  };
}

const SUPPORTED_CHAIN_ID = 5000 as const;

function resolveChain(opts: MethStakingProviderOpts): { viemChain: Chain; chainId: EvmChainId } {
  if (opts.chain) {
    if (opts.chain === 'mantle-mainnet') return { viemChain: mantleMainnet, chainId: 5000 };
    const id = opts.chain.id;
    if (id !== SUPPORTED_CHAIN_ID) {
      throw new ConciergeError(
        'NetworkUnsupported',
        `[@concierge-mantle/meth-staking] expected Mantle Mainnet (5000), got chainId ${id}.`,
        undefined,
        { chainId: id },
      );
    }
    return { viemChain: opts.chain, chainId: id as EvmChainId };
  }
  return { viemChain: mantleMainnet, chainId: 5000 };
}

export function createMethStakingProvider(
  opts: MethStakingProviderOpts = {},
  deps: MethStakingDeps,
): MethStakingProvider {
  // Fail-fast at construction if dexProvider is absent — unwrapToWETH would silently break.
  if (!deps?.dexProvider) {
    throw new ConciergeError(
      'ConfigError',
      'MissingDependency(@concierge-mantle/mantle-dex): dexProvider is required for @concierge-mantle/meth-staking. ' +
        'Pass { dexProvider: createMantleDexProvider(...) } as the second argument.',
    );
  }

  const { viemChain, chainId } = resolveChain(opts);
  const transport = http(opts.rpcUrl ?? viemChain.rpcUrls.default.http[0]);
  const publicClient = opts.publicClient ?? createPublicClient({ chain: viemChain, transport });

  let sharedAddrs: ReturnType<typeof addressesFor> | undefined;
  try {
    sharedAddrs = addressesFor(chainId);
  } catch (err) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge-mantle/meth-staking] failed to load shared addresses for chainId ${chainId}`,
      err instanceof Error ? err : undefined,
    );
  }

  const ov = opts.addresses ?? {};
  const addresses: MethAddresses = {
    meth: ov.meth ?? sharedAddrs?.tokens.mETH ?? ZERO_ADDRESS,
    weth: ov.weth ?? sharedAddrs?.tokens.WETH ?? ZERO_ADDRESS,
    agniMethWeth: ov.agniMethWeth ?? MANTLE_AGNI_METH_WETH,
  };

  for (const [name, addr] of [
    ['meth', addresses.meth],
    ['weth', addresses.weth],
    ['agniMethWeth', addresses.agniMethWeth],
  ] as const) {
    if (addr === ZERO_ADDRESS) {
      throw new ConciergeError(
        'ConfigError',
        `[@concierge-mantle/meth-staking] address '${name}' is the zero address. Pass addresses: { ${name} } for custom deployments.`,
      );
    }
  }

  const ctx: ActionContext = {
    publicClient,
    chainId,
    addresses,
    dexProvider: deps.dexProvider,
  };

  return Object.freeze({
    chainId: SUPPORTED_CHAIN_ID,
    actions: Object.freeze({
      getBalance: createGetBalanceTool(ctx),
      getExchangeRate: createGetExchangeRateTool(ctx),
      getYieldRate: createGetYieldRateTool(ctx),
      acquire: createAcquireTool(ctx),
      getUnwrapToWETH: createGetUnwrapToWETHTool(ctx),
    }),
  });
}
