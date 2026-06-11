import type { Address } from '@concierge/shared';
import { type PublicClient, parseAbi } from 'viem';
import { computeRateFromSqrt, fetchPoolState, fetchYieldBps } from './_agni.ts';
import type { MethAddresses } from './_context.ts';

const ERC20_ABI = parseAbi(['function balanceOf(address owner) view returns (uint256)']);

export async function getExchangeRate(
  publicClient: PublicClient,
  addresses: MethAddresses,
): Promise<bigint> {
  const { sqrtPriceX96 } = await fetchPoolState(
    publicClient,
    addresses.agniMethWeth,
    'selectors.getExchangeRate',
  );
  return computeRateFromSqrt(sqrtPriceX96);
}

export async function getMethBalance(
  publicClient: PublicClient,
  addresses: MethAddresses,
  user: Address,
): Promise<{ raw: bigint; ethValue: bigint }> {
  const [{ sqrtPriceX96 }, raw] = await Promise.all([
    fetchPoolState(publicClient, addresses.agniMethWeth, 'selectors.getMethBalance'),
    publicClient.readContract({
      address: addresses.meth,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [user],
    }),
  ]);
  const rate = computeRateFromSqrt(sqrtPriceX96);
  return { raw, ethValue: (raw * rate) / 10n ** 18n };
}

export async function getAnnualizedYieldBps(
  publicClient: PublicClient,
  addresses: MethAddresses,
): Promise<number> {
  return fetchYieldBps(publicClient, addresses.agniMethWeth, 'selectors.getAnnualizedYieldBps');
}
