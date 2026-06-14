import { ConciergeError } from '@concierge-mantle/sdk';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { createKernelAccount, createKernelAccountClient } from '@zerodev/sdk';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { getUserOperationGasPrice } from 'permissionless/actions/pimlico';
import type { LocalAccount } from 'viem';
import { createPublicClient, http } from 'viem';
import type { CHAIN_CONFIGS } from './constants.ts';
import {
  type PaymasterMode,
  resolveChainConfig,
  rpcCatch,
  sanitizeCause,
  shouldUsePaymaster,
} from './internal.ts';
import { createPaymasterClient } from './paymaster.ts';
import type { ConciergeAccount, KernelClientStub, SupportedChain } from './types.ts';

/**
 * EntryPoint v0.7 — hoisted to module const per Context7 audit L2 to
 * eliminate three duplicate inline `getEntryPoint('0.7')` call sites and
 * make the version pin trivially auditable via `grep`.
 */
const ENTRY_POINT = getEntryPoint('0.7');

export interface CreateConciergeAccountConfig {
  owner: LocalAccount;
  chain: SupportedChain;
  /**
   * Paymaster strategy. Defaults per `shouldUsePaymaster`:
   *   - mantle-sepolia → 'pimlico'
   *   - mantle-mainnet → 'none' (user pays MNT)
   * PIMLICO_API_KEY (or apiKey) is required regardless — the Pimlico
   * bundler authenticates ALL requests, not just sponsored ones.
   */
  paymaster?: PaymasterMode;
  /** Pimlico API key. Defaults to `process.env.PIMLICO_API_KEY`. */
  apiKey?: string;
}

function resolveCreateConfig(config: CreateConciergeAccountConfig): {
  chainConfig: (typeof CHAIN_CONFIGS)[keyof typeof CHAIN_CONFIGS];
  apiKey: string;
  bundlerUrl: string;
} {
  return resolveChainConfig(
    'createConciergeAccount',
    config.chain,
    // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket notation
    config.apiKey ?? process.env['PIMLICO_API_KEY'],
  );
}

export async function createConciergeAccount(
  config: CreateConciergeAccountConfig,
): Promise<ConciergeAccount> {
  const { chainConfig, apiKey, bundlerUrl } = resolveCreateConfig(config);
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.chain.rpcUrls.default.http[0]),
  });

  // Context7 audit M1: drop `signer: config.owner as any`. viem is now a
  // direct dep at a single pinned version (2.52.2 per package.json), so
  // `LocalAccount` resolves consistently across `@zerodev/ecdsa-validator`'s
  // peer dep and our import. If a future version skew re-emerges the type
  // check will catch it — no longer silently masked.
  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: config.owner,
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
  }).catch(rpcCatch('createConciergeAccount: ECDSA validator init failed', config.chain, apiKey));
  const kernelAccount = await createKernelAccount(publicClient, {
    plugins: { sudo: ecdsaValidator },
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
  }).catch(rpcCatch('createConciergeAccount: kernel account init failed', config.chain, apiKey));
  const smartAccountAddress = kernelAccount.address;

  // Context7 audit H3: single source-of-truth for paymaster decision.
  const usePaymaster = shouldUsePaymaster(config.chain, config.paymaster);
  const paymasterClient = createPaymasterClient(
    usePaymaster
      ? { chain: config.chain, sponsorshipPolicy: 'always', apiKey }
      : { chain: config.chain, sponsorshipPolicy: 'never' },
  );

  let kernelClient: KernelClientStub & object;
  try {
    kernelClient = createKernelAccountClient({
      account: kernelAccount,
      chain: chainConfig.chain,
      bundlerTransport: http(bundlerUrl),
      client: publicClient,
      // Context7 audit C1+H1: REQUIRED in ZeroDev 5.4+. Without
      // estimateFeesPerGas, viem's default fee estimation overpays 5–50×
      // on Mantle (volatile L1 fee). Use Pimlico's typed gas-price oracle
      // and pick `standard` (safe default for autonomous tick workers).
      userOperation: {
        estimateFeesPerGas: async ({ bundlerClient }) => {
          const gasPrice = await getUserOperationGasPrice(bundlerClient);
          return gasPrice.standard;
        },
      },
      // Context7 audit M5: pass the paymaster client directly. Previously
      // unbound `getPaymasterData` + `getPaymasterStubData` methods would
      // break if viem started using `this` internally. The direct form
      // matches the Pimlico-on-ZeroDev canonical example.
      ...(paymasterClient && { paymaster: paymasterClient }),
    }) as unknown as KernelClientStub & object;
  } catch (err) {
    throw new ConciergeError(
      'RpcError',
      `[@concierge-mantle/smart-account] createConciergeAccount: kernel client init failed (chain: '${config.chain}')`,
      sanitizeCause(err, apiKey),
    );
  }
  return { smartAccountAddress, kernelAccount, kernelClient };
}
