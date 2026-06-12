import { defineChain } from 'viem';

export const ENTRYPOINT_V07_ADDRESS =
  '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const satisfies `0x${string}`;

export const KERNEL_FACTORY_ADDRESS =
  '0xaac5D4240AF87249B3f71BC8E4A2cae074A3E419' as const satisfies `0x${string}`;

export const MANTLE_MAINNET = defineChain({
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mantle.xyz'] } },
  blockExplorers: { default: { name: 'MantleScan', url: 'https://mantlescan.xyz' } },
});

export const MANTLE_SEPOLIA = defineChain({
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sepolia.mantle.xyz'] } },
  blockExplorers: { default: { name: 'MantleScan', url: 'https://sepolia.mantlescan.xyz' } },
});

export const CHAIN_CONFIGS = {
  'mantle-mainnet': {
    chain: MANTLE_MAINNET,
    bundlerBaseUrl: 'https://api.pimlico.io/v2/mantle/rpc',
  },
  'mantle-sepolia': {
    chain: MANTLE_SEPOLIA,
    bundlerBaseUrl: 'https://api.pimlico.io/v2/mantle-sepolia/rpc',
  },
} as const;
