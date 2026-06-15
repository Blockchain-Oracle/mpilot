// Compose every concrete provider into the `ProviderToolFactory[]` the tool
// registry expects. Lives in @mpilot/runtime (NOT @mpilot/sdk) because providers
// import `ConciergeError` from @mpilot/sdk — `sdk → providers` would be a cycle.
//
// Two modes:
//  - `execute`  : full tool set; write tools sign + send via `walletClient`
//                 (worker / scripts / manual testing with a server EOA).
//  - `propose`  : the wallet provider runs in propose mode (writes become
//                 unsigned tx previews the chat signs client-side) and the other
//                 providers contribute only their READ tools (no server custody).

import { createAaveV3MantleProvider } from '@mpilot/aave-v3-mantle';
import { createErc8004Provider } from '@mpilot/erc8004';
import { createEthenaSusdeProvider } from '@mpilot/ethena-susde';
import { createLifiBridgeProvider } from '@mpilot/lifi-bridge';
import { createMantleDexProvider } from '@mpilot/mantle-dex';
import type { DexProviderLike } from '@mpilot/meth-staking';
import { createMethStakingProvider } from '@mpilot/meth-staking';
import { createOndoUsdyProvider } from '@mpilot/ondo-usdy';
import type { ConciergeTool, ProviderToolFactory } from '@mpilot/tools';
import { createWalletProvider } from '@mpilot/wallet';
import type { PublicClient, WalletClient } from 'viem';
import { namespaceTool } from './namespaceTool.ts';

export type AssembleMode = 'execute' | 'propose';
export type MantleChain = 'mantle-mainnet' | 'mantle-sepolia';

export interface AssembleProvidersOptions {
  /** `execute` (default) signs + sends; `propose` returns unsigned previews + reads only. */
  mode?: AssembleMode;
  chain: MantleChain;
  publicClient?: PublicClient;
  walletClient?: WalletClient;
  rpcUrl?: string;
}

/** Read-only tool names per provider, surfaced in `propose` mode (no server signing). */
const PROPOSE_READS: Record<string, ReadonlySet<string>> = {
  dex: new Set(['quote']),
  aave: new Set<string>(),
  ethena: new Set(['getYieldRate', 'getCarryVsAave']),
  ondo: new Set(['getBalance', 'getYieldRate', 'getRateAccrual']),
  meth: new Set(['getBalance', 'getExchangeRate', 'getYieldRate', 'getUnwrapToWETH']),
  lifi: new Set(['quote', 'getStatus']),
  erc8004: new Set(['readFeedback', 'readReputation']),
};

// biome-ignore lint/suspicious/noExplicitAny: provider action maps are erased to ConciergeTool at this boundary.
type Actions = Record<string, ConciergeTool<any, any>>;

/** Namespace a provider's actions, filtering to its read allowlist in propose mode. */
function pick(
  prefix: string,
  actions: Actions,
  mode: AssembleMode,
  // biome-ignore lint/suspicious/noExplicitAny: see Actions.
): Array<ConciergeTool<any, any>> {
  const reads = PROPOSE_READS[prefix];
  return Object.values(actions)
    .filter((t) => mode === 'execute' || reads === undefined || reads.has(t.name))
    .map((t) => namespaceTool(prefix, t));
}

/** Wrap a precomputed tool list as a (sync, agent-ignoring) ProviderToolFactory. */
// biome-ignore lint/suspicious/noExplicitAny: see Actions.
function asFactory(tools: Array<ConciergeTool<any, any>>): ProviderToolFactory {
  return () => tools;
}

export function assembleProviders(opts: AssembleProvidersOptions): ProviderToolFactory[] {
  const { chain, publicClient, walletClient, rpcUrl } = opts;
  const mode: AssembleMode = opts.mode ?? 'execute';
  const chainId = chain === 'mantle-mainnet' ? 5000 : 5003;

  // Omit undefined keys — providers declare `rpcUrl?: string` (not `| undefined`),
  // which `exactOptionalPropertyTypes` forbids passing an explicit `undefined` to.
  const pc = publicClient ? { publicClient } : {};
  const wc = walletClient ? { walletClient } : {};
  const rpc = rpcUrl ? { rpcUrl } : {};
  const base = { chain, ...pc, ...wc, ...rpc };

  const wallet = createWalletProvider({ mode, ...base });
  const dex = createMantleDexProvider(base);
  const aave = createAaveV3MantleProvider(base);
  const lifi = createLifiBridgeProvider({ ...pc, ...wc, ...rpc });
  const erc8004 = createErc8004Provider({ chain, ...pc, ...wc, ...rpc });

  const factories: ProviderToolFactory[] = [
    // Wallet runs in its own mode; include every action (its propose tools are demo-safe).
    asFactory(pick('wallet', wallet.actions, 'execute')),
    asFactory(pick('dex', dex.actions, mode)),
    asFactory(pick('aave', aave.actions, mode)),
    asFactory(pick('lifi', lifi.actions, mode)),
    asFactory(pick('erc8004', erc8004.actions, mode)),
  ];

  // Mainnet-only providers: Ethena (its sUSDe valuation needs a DEX router that is
  // zero on Sepolia), Ondo + mETH (mainnet-only, no walletClient — mETH delegates
  // writes to its dexProvider). On Sepolia their tools would be network-gated out
  // anyway, and Ethena even throws at construction, so we only build them on mainnet.
  if (chainId === 5000) {
    const ethena = createEthenaSusdeProvider(base);
    const ondo = createOndoUsdyProvider({ chain: 'mantle-mainnet', ...pc, ...rpc });
    const meth = createMethStakingProvider(
      { chain: 'mantle-mainnet', ...pc, ...rpc },
      { dexProvider: dexProviderAdapter(dex) },
    );
    factories.push(asFactory(pick('ethena', ethena.actions, mode)));
    factories.push(asFactory(pick('ondo', ondo.actions, mode)));
    factories.push(asFactory(pick('meth', meth.actions, mode)));
  }

  return factories;
}

/**
 * Adapt the mantle-dex provider to mETH's `DexProviderLike` — mETH's swap takes
 * `amountIn: bigint` and returns `{ txHash, amountOut }`, while mantle-dex's swap
 * takes a decimal `amountIn` string and returns a richer payload.
 */
function dexProviderAdapter(dex: ReturnType<typeof createMantleDexProvider>): DexProviderLike {
  return {
    actions: {
      swap: {
        invoke: async (args) => {
          const r = await dex.actions.swap.invoke({
            tokenIn: args.tokenIn,
            tokenOut: args.tokenOut,
            amountIn: args.amountIn.toString(),
            slippageBps: args.slippageBps,
            recipient: args.recipient,
          });
          return { txHash: r.txHash, amountOut: r.amountOut };
        },
      },
    },
  };
}
