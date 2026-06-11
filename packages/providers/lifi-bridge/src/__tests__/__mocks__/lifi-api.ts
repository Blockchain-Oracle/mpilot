import { HttpResponse, http } from 'msw';
import { LIFI_API } from '../../_context.ts';

const DEX_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as const;
const DEST_TX_HASH = '0x9999999999999999999999999999999999999999999999999999999999999999' as const;

const ROUTE_BASE = {
  fromChainId: 5000,
  toChainId: 1,
  fromToken: {
    address: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
    symbol: 'USDC',
    decimals: 6,
    chainId: 5000,
  },
  toToken: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    decimals: 6,
    chainId: 1,
  },
  estimate: {
    fromAmount: '100000000',
    toAmount: '99500000',
    toAmountMin: '99000000',
    executionDuration: 600,
    gasCosts: [
      {
        amount: '1000000000000000',
        amountUSD: '3.50',
        token: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'MNT',
          decimals: 18,
        },
      },
    ],
  },
  transactionRequest: {
    to: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
    data: '0x3d0a87400000000000000000000000000000000000000000000000000000000000000001',
    value: '0',
    gasLimit: '500000',
    chainId: 5000,
  },
};

export const FIXTURE_ROUTES = [
  {
    ...ROUTE_BASE,
    id: 'route-stargate-001',
    steps: [
      {
        id: 'step-1',
        type: 'cross',
        tool: 'stargate',
        toolDetails: { name: 'Stargate', key: 'stargate' },
        estimate: ROUTE_BASE.estimate,
      },
    ],
    tags: ['RECOMMENDED'],
  },
  {
    ...ROUTE_BASE,
    id: 'route-across-002',
    estimate: {
      ...ROUTE_BASE.estimate,
      executionDuration: 300,
      gasCosts: [
        {
          amount: '800000000000000',
          amountUSD: '2.80',
          token: {
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'MNT',
            decimals: 18,
          },
        },
      ],
    },
    transactionRequest: {
      ...ROUTE_BASE.transactionRequest,
      data: '0x9d1b2a440000000000000000000000000000000000000000000000000000000000000002',
    },
    steps: [
      {
        id: 'step-2',
        type: 'cross',
        tool: 'across',
        toolDetails: { name: 'Across', key: 'across' },
        estimate: ROUTE_BASE.estimate,
      },
    ],
    tags: ['FASTEST'],
  },
  {
    ...ROUTE_BASE,
    id: 'route-connext-003',
    steps: [
      {
        id: 'step-3',
        type: 'cross',
        tool: 'connext',
        toolDetails: { name: 'Connext', key: 'connext' },
        estimate: ROUTE_BASE.estimate,
      },
    ],
    tags: [],
  },
];

export const handlers = [
  http.post(`${LIFI_API}/routes`, () => HttpResponse.json({ routes: FIXTURE_ROUTES })),

  http.get(`${LIFI_API}/status`, ({ request }) => {
    const url = new URL(request.url);
    const txHash = url.searchParams.get('txHash');

    if (txHash === DEX_TX_HASH) {
      return HttpResponse.json({
        status: 'DONE',
        tool: 'stargate',
        fromTx: { txHash: DEX_TX_HASH, chainId: 5000 },
        toTx: { txHash: DEST_TX_HASH, chainId: 1 },
      });
    }

    if (txHash === '0x1111111111111111111111111111111111111111111111111111111111111111') {
      return HttpResponse.json({ status: 'PENDING', fromTx: { txHash, chainId: 5000 } });
    }

    return HttpResponse.json({ status: 'NOT_FOUND' });
  }),
];

export { DEST_TX_HASH, DEX_TX_HASH };
