import { ConciergeError } from '@concierge-mantle/sdk';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { createKernelAccount, createKernelAccountClient } from '@zerodev/sdk';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { getUserOperationGasPrice } from 'permissionless/actions/pimlico';
import type { Address, LocalAccount } from 'viem';
import { createPublicClient, http, isAddress } from 'viem';
import type { CHAIN_CONFIGS } from './constants.ts';
import { validatePimlicoStandardTier } from './gasPrice.ts';
import {
  type PaymasterMode,
  resolveChainConfig,
  rpcCatch,
  sanitizeCause,
  shouldUsePaymaster,
} from './internal.ts';
import { createPaymasterClient } from './paymaster.ts';
import type { ConciergeAccount, KernelClientStub, SupportedChain } from './types.ts';

/** EntryPoint v0.7 — hoisted module const per Context7 audit L2. */
const ENTRY_POINT = getEntryPoint('0.7');

export interface ConnectConciergeAccountConfig {
  address: Address;
  owner: LocalAccount;
  chain: SupportedChain;
  /**
   * Paymaster strategy. Defaults per `shouldUsePaymaster`:
   *   - mantle-sepolia → 'pimlico'
   *   - mantle-mainnet → 'none' (user pays MNT)
   * PIMLICO_API_KEY (or apiKey) is required regardless.
   */
  paymaster?: PaymasterMode;
  /** Pimlico API key. Defaults to `process.env.PIMLICO_API_KEY`. */
  apiKey?: string;
}

function validateConnectConfig(config: ConnectConciergeAccountConfig): {
  chainConfig: (typeof CHAIN_CONFIGS)[keyof typeof CHAIN_CONFIGS];
  bundlerUrl: string;
  apiKey: string;
} {
  if (!isAddress(config.address)) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge-mantle/smart-account] connectToConciergeAccount: InvalidAddress('${config.address}') — must be a 42-char 0x-prefixed hex string.`,
    );
  }
  return resolveChainConfig(
    'connectToConciergeAccount',
    config.chain,
    // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket notation
    config.apiKey ?? process.env['PIMLICO_API_KEY'],
  );
}

/**
 * Re-attach to a previously-deployed Kernel account at a known address.
 * No deployment transaction is fired — CREATE2 computes the same address
 * for the same owner + chain, so the account object is reconstructed locally.
 *
 * Note: ZeroDev echoes the supplied address back without cross-validating the
 * owner's CREATE2 derivation. Owner/address consistency is enforced at UserOp
 * submission time (EntryPoint AA24 signature error) rather than here.
 */
export async function connectToConciergeAccount(
  config: ConnectConciergeAccountConfig,
): Promise<ConciergeAccount> {
  const { chainConfig, bundlerUrl, apiKey } = validateConnectConfig(config);
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.chain.rpcUrls.default.http[0]),
  });

  // Context7 audit M1: drop `as any` on signer; single pinned viem version.
  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: config.owner,
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
  }).catch(
    rpcCatch('connectToConciergeAccount: ECDSA validator init failed', config.chain, apiKey),
  );
  const kernelAccount = await createKernelAccount(publicClient, {
    plugins: { sudo: ecdsaValidator },
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
    address: config.address,
  }).catch(rpcCatch('connectToConciergeAccount: kernel account init failed', config.chain, apiKey));
  if (!kernelAccount.address) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge-mantle/smart-account] connectToConciergeAccount: kernel account returned no address (malformed SDK response).`,
    );
  }
  if (kernelAccount.address.toLowerCase() !== config.address.toLowerCase()) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge-mantle/smart-account] connectToConciergeAccount: address mismatch — supplied '${config.address}' but kernel account resolved to '${kernelAccount.address}'. Causes: (1) owner key does not match this smart account, (2) kernel version / entry point / validator config used at creation differs from current.`,
    );
  }
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
      // Context7 audit C1+H1: REQUIRED in ZeroDev 5.4+. Use Pimlico's typed
      // gas-price oracle and pick `standard` (safe default for tick workers).
      userOperation: {
        estimateFeesPerGas: async ({ bundlerClient }) => {
          // silent-failure C-NEW-5 (round 2): shared invariant check.
          const gasPrice = await getUserOperationGasPrice(bundlerClient);
          return validatePimlicoStandardTier(gasPrice, config.chain);
        },
      },
      // Context7 audit M5: direct paymaster client, no unbinding.
      ...(paymasterClient && { paymaster: paymasterClient }),
    }) as unknown as KernelClientStub & object;
  } catch (err) {
    throw new ConciergeError(
      'RpcError',
      `[@concierge-mantle/smart-account] connectToConciergeAccount: kernel client init failed (chain: '${config.chain}')`,
      sanitizeCause(err, apiKey),
    );
  }
  return { smartAccountAddress, kernelAccount, kernelClient };
}
