import { ConciergeError } from '@mpilot/sdk';
import { http } from 'viem';
import {
  type BundlerClient,
  type PaymasterClient,
  createBundlerClient as viemCreateBundlerClient,
  createPaymasterClient as viemCreatePaymasterClient,
} from 'viem/account-abstraction';
import { CHAIN_CONFIGS } from './constants.ts';
import { type PaymasterMode, sanitizeCause, shouldUsePaymaster } from './internal.ts';
import type { SupportedChain } from './types.ts';

export type { BundlerClient, PaymasterClient };

/** Bundle. `paymasterClient` is null when caller opts into user-pays. */
export interface BundlerBundle {
  readonly chain: SupportedChain;
  readonly bundlerClient: BundlerClient;
  readonly paymasterClient: PaymasterClient | null;
}

export interface CreateBundlerClientConfig {
  chain: SupportedChain;
  /** Defaults to `process.env.PIMLICO_API_KEY` */
  apiKey?: string;
  /**
   * Paymaster strategy. Context7 audit H3: defaults via `shouldUsePaymaster`
   * — sepolia → 'pimlico', mainnet → 'none'. Override per call.
   * Previously hardcoded chain-based, which could disagree with
   * `createConciergeAccount`'s decision; now both go through the same
   * helper.
   */
  paymaster?: PaymasterMode;
}

/**
 * Returns a Pimlico bundler client + paymaster bundle for the given chain.
 * Paymaster wiring routed through `shouldUsePaymaster` so this entry point
 * and `createConciergeAccount` always agree.
 */
export function createBundlerClient(config: CreateBundlerClientConfig): BundlerBundle {
  // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket notation
  const apiKey = config.apiKey ?? process.env['PIMLICO_API_KEY'];
  if (!apiKey) {
    throw new ConciergeError(
      'ConfigError',
      "[@mpilot/smart-account] createBundlerClient: MissingEnvVar('PIMLICO_API_KEY') — set this env var before creating a bundler client.",
    );
  }
  const chainConfig = CHAIN_CONFIGS[config.chain];
  if (!chainConfig) {
    throw new ConciergeError(
      'ConfigError',
      `[@mpilot/smart-account] createBundlerClient: UnsupportedChain('${config.chain}') — supported: ${Object.keys(CHAIN_CONFIGS).join(', ')}`,
    );
  }
  const bundlerUrl = `${chainConfig.bundlerBaseUrl}?apikey=${encodeURIComponent(apiKey)}`;
  let bundlerClient: BundlerClient;
  try {
    bundlerClient = viemCreateBundlerClient({
      chain: chainConfig.chain,
      transport: http(bundlerUrl),
    });
  } catch (err) {
    throw new ConciergeError(
      'RpcError',
      `[@mpilot/smart-account] createBundlerClient: bundler transport init failed (chain: '${config.chain}')`,
      sanitizeCause(err, apiKey),
    );
  }

  const usePaymaster = shouldUsePaymaster(config.chain, config.paymaster);
  if (!usePaymaster) {
    return { chain: config.chain, bundlerClient, paymasterClient: null };
  }
  let paymasterClient: PaymasterClient;
  try {
    paymasterClient = viemCreatePaymasterClient({ transport: http(bundlerUrl) });
  } catch (err) {
    throw new ConciergeError(
      'RpcError',
      `[@mpilot/smart-account] createBundlerClient: paymaster transport init failed (chain: '${config.chain}')`,
      sanitizeCause(err, apiKey),
    );
  }
  return { chain: config.chain, bundlerClient, paymasterClient };
}
