import { ConciergeError } from '@mpilot/sdk';
import { getUserOperationGasPrice } from 'permissionless/actions/pimlico';
import { http } from 'viem';
import { createBundlerClient } from 'viem/account-abstraction';
import { CHAIN_CONFIGS } from './constants.ts';
import { sanitizeCause } from './internal.ts';
import type { SupportedChain } from './types.ts';

export interface UserOpGasPrice {
  readonly maxFeePerGas: bigint;
  readonly maxPriorityFeePerGas: bigint;
  /** Unix timestamp (ms) when this snapshot was fetched. Gas prices change per block — do not cache. */
  readonly fetchedAt: number;
}

export interface GetUserOpGasPriceConfig {
  chain: SupportedChain;
  /** Defaults to `process.env.PIMLICO_API_KEY` */
  apiKey?: string;
}

/**
 * Queries Pimlico's gas-price oracle for current UserOp gas prices.
 * Must be called fresh per UserOp — gas prices change block-to-block.
 *
 * Per Context7 audit 2026-06-14 (CRITICAL C1+H1): previously ~193 LOC of
 * hand-rolled `fetch` + hex parsing + 6 throw paths. Now uses
 * `permissionless/actions/pimlico`'s typed `getUserOperationGasPrice` —
 * the canonical Pimlico pattern (per ZeroDev migration docs 5.3→5.4).
 *
 * Returns the `standard` tier — `slow` risks UserOp staying out of mempool,
 * `fast` overpays. Standard is the safe default for autonomous tick workers.
 */
export async function getUserOpGasPrice(config: GetUserOpGasPriceConfig): Promise<UserOpGasPrice> {
  // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket notation
  const apiKey = config.apiKey ?? process.env['PIMLICO_API_KEY'];
  if (!apiKey) {
    throw new ConciergeError(
      'ConfigError',
      "[@mpilot/smart-account] getUserOpGasPrice: MissingEnvVar('PIMLICO_API_KEY') — set this env var before querying gas price.",
    );
  }
  const chainConfig = CHAIN_CONFIGS[config.chain];
  if (!chainConfig) {
    throw new ConciergeError(
      'ConfigError',
      `[@mpilot/smart-account] getUserOpGasPrice: UnsupportedChain('${config.chain}') — supported: ${Object.keys(CHAIN_CONFIGS).join(', ')}`,
    );
  }
  const bundlerUrl = `${chainConfig.bundlerBaseUrl}?apikey=${encodeURIComponent(apiKey)}`;
  const bundlerClient = createBundlerClient({
    chain: chainConfig.chain,
    transport: http(bundlerUrl),
  });
  // silent-failure H1: narrow the broad catch to the network call ONLY. The
  // shape-contract validation below (standard tier present, bigints, EIP-1559
  // invariant) must throw the specific RpcError it constructed, not be
  // re-wrapped as a generic "RPC failed" — operators chasing intermittent
  // gas-price drift need to distinguish Pimlico response-shape change from
  // Pimlico network outage.
  let gasPrice: Awaited<ReturnType<typeof getUserOperationGasPrice>>;
  try {
    gasPrice = await getUserOperationGasPrice(bundlerClient);
  } catch (err) {
    if (err instanceof ConciergeError) throw err;
    throw new ConciergeError(
      'RpcError',
      `[@mpilot/smart-account] getUserOpGasPrice: Pimlico bundler RPC failed (chain: '${config.chain}')`,
      sanitizeCause(err, apiKey),
    );
  }
  const { maxFeePerGas, maxPriorityFeePerGas } = validatePimlicoStandardTier(
    gasPrice,
    config.chain,
  );
  return { maxFeePerGas, maxPriorityFeePerGas, fetchedAt: Date.now() };
}

/**
 * silent-failure C-NEW-5 (round 2): shared invariant check for Pimlico's
 * `getUserOperationGasPrice` `.standard` tier. Used by `getUserOpGasPrice`
 * AND by the `estimateFeesPerGas` callback wired into
 * `createKernelAccountClient` in createAccount/connectAccount — without this,
 * those callbacks bypassed the shape/EIP-1559 guards entirely and a malformed
 * Pimlico response would silently send underpriced UserOps that never mine.
 *
 * Validates:
 *  - `.standard` present
 *  - `maxFeePerGas` / `maxPriorityFeePerGas` are bigints (catches future
 *    permissionless regression returning hex strings)
 *  - both positive (silent-fail #3: zero fee → UserOp stuck in mempool)
 *  - EIP-1559 invariant: `maxPriorityFeePerGas <= maxFeePerGas`
 */
export function validatePimlicoStandardTier(
  gasPrice: Awaited<ReturnType<typeof getUserOperationGasPrice>>,
  chain: SupportedChain,
): { readonly maxFeePerGas: bigint; readonly maxPriorityFeePerGas: bigint } {
  const standard = gasPrice?.standard;
  if (
    !standard ||
    typeof standard.maxFeePerGas !== 'bigint' ||
    typeof standard.maxPriorityFeePerGas !== 'bigint'
  ) {
    throw new ConciergeError(
      'RpcError',
      `[@mpilot/smart-account] getUserOpGasPrice: Pimlico response missing or malformed 'standard' tier (chain: '${chain}'). Expected { standard: { maxFeePerGas: bigint, maxPriorityFeePerGas: bigint } }.`,
    );
  }
  const { maxFeePerGas, maxPriorityFeePerGas } = standard;
  if (maxFeePerGas <= 0n || maxPriorityFeePerGas <= 0n) {
    throw new ConciergeError(
      'RpcError',
      `[@mpilot/smart-account] getUserOpGasPrice: zero or negative gas price from Pimlico — maxFeePerGas=${maxFeePerGas} maxPriorityFeePerGas=${maxPriorityFeePerGas}`,
    );
  }
  if (maxPriorityFeePerGas > maxFeePerGas) {
    throw new ConciergeError(
      'RpcError',
      `[@mpilot/smart-account] getUserOpGasPrice: EIP-1559 invariant violated — maxPriorityFeePerGas (${maxPriorityFeePerGas}) > maxFeePerGas (${maxFeePerGas})`,
    );
  }
  return { maxFeePerGas, maxPriorityFeePerGas };
}
