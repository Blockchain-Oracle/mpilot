import type { Address, Hex } from '@concierge-mantle/shared';

export type VenueName = 'merchantMoe' | 'agni' | 'fusionx' | 'woofi' | 'lifi';

export interface VenueQuoteParams {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  account?: Address;
  slippageBps?: number;
}

export interface VenueQuoteResult {
  venue: VenueName;
  amountOut: bigint;
  gasEstimate?: bigint;
  approvalAddress?: Address;
}

export interface VenueSwapParams {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOutMin: bigint;
  slippageBps: number;
  recipient: Address;
  account: Address;
  deadline: bigint;
}

export interface VenueSwapResult {
  txHash: Hex;
  amountOut: bigint;
  spender: Address;
}

export interface Venue {
  readonly name: VenueName;
  quote(params: VenueQuoteParams): Promise<VenueQuoteResult | null>;
  swap(params: VenueSwapParams): Promise<VenueSwapResult>;
}
