import { ConciergeError } from '@concierge/sdk';
import { LIFI_API } from './_context.ts';
import {
  type LifiBridgeRoute,
  LifiRoutesResponseSchema,
  type LifiStatusResponse,
  LifiStatusResponseSchema,
} from './_types.ts';

function apiHeaders(apiKey?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) h['x-lifi-api-key'] = apiKey;
  return h;
}

export interface GetRoutesParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  fromAddress: string;
  toAddress: string;
  slippage: number;
  integrator: string;
  apiKey: string | undefined;
}

async function doFetch(url: string, init: RequestInit, label: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw new ConciergeError(
      'RpcError',
      `[@concierge/lifi-bridge] ${label}: network error`,
      err instanceof Error ? err : undefined,
    );
  }
  if (!res.ok)
    throw new ConciergeError('RpcError', `[@concierge/lifi-bridge] ${label}: HTTP ${res.status}`);
  try {
    return await res.json();
  } catch (err) {
    throw new ConciergeError(
      'RpcError',
      `[@concierge/lifi-bridge] ${label}: response is not valid JSON`,
      err instanceof Error ? err : undefined,
    );
  }
}

function normalizeRoute(
  raw: ReturnType<typeof LifiRoutesResponseSchema.parse>['routes'][number],
  receivedAt: number,
): LifiBridgeRoute | null {
  const txReq = raw.transactionRequest ?? raw.steps[0]?.transactionRequest;
  if (!txReq) return null;
  return {
    id: raw.id,
    fromChainId: raw.fromChainId,
    toChainId: raw.toChainId,
    fromToken: raw.fromToken,
    toToken: raw.toToken,
    estimate: {
      fromAmount: raw.estimate.fromAmount ?? '0',
      toAmount: raw.estimate.toAmount ?? '0',
      toAmountMin: raw.estimate.toAmountMin ?? '0',
      executionDuration: raw.estimate.executionDuration ?? 0,
      gasCosts: raw.estimate.gasCosts,
    },
    steps: raw.steps,
    tags: raw.tags,
    transactionRequest: txReq,
    _receivedAt: receivedAt,
  };
}

export async function fetchRoutes(params: GetRoutesParams): Promise<LifiBridgeRoute[]> {
  const body = {
    fromChainId: params.fromChainId,
    toChainId: params.toChainId,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    toAddress: params.toAddress,
    options: {
      slippage: params.slippage,
      order: 'RECOMMENDED' as const,
      integrator: params.integrator,
    },
  };

  const json = await doFetch(
    `${LIFI_API}/routes`,
    { method: 'POST', headers: apiHeaders(params.apiKey), body: JSON.stringify(body) },
    'fetchRoutes',
  );
  const parsed = LifiRoutesResponseSchema.safeParse(json);
  if (!parsed.success)
    throw new ConciergeError(
      'RpcError',
      `[@concierge/lifi-bridge] fetchRoutes: unexpected response shape — ${parsed.error.message}`,
    );

  const receivedAt = Date.now();
  return parsed.data.routes
    .map((r) => normalizeRoute(r, receivedAt))
    .filter((r): r is LifiBridgeRoute => r !== null);
}

export interface GetStatusParams {
  txHash: string;
  fromChain: number;
  toChain: number;
  apiKey: string | undefined;
}

export async function fetchBridgeStatus(params: GetStatusParams): Promise<LifiStatusResponse> {
  const url = new URL(`${LIFI_API}/status`);
  url.searchParams.set('txHash', params.txHash);
  url.searchParams.set('fromChain', String(params.fromChain));
  url.searchParams.set('toChain', String(params.toChain));

  const json = await doFetch(
    url.toString(),
    { headers: apiHeaders(params.apiKey) },
    `fetchBridgeStatus(${params.txHash})`,
  );
  const parsed = LifiStatusResponseSchema.safeParse(json);
  if (!parsed.success)
    throw new ConciergeError(
      'RpcError',
      `[@concierge/lifi-bridge] fetchBridgeStatus: unexpected response shape — ${parsed.error.message}`,
    );
  return parsed.data;
}
