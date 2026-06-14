/**
 * Wagmi config for the Concierge web app.
 *
 * Mantle Sepolia is the default chain (every dev flow runs here); Mantle
 * Mainnet is supported for read-only views but we never default to it during
 * onboarding (gas would come out of the user's wallet).
 *
 * Per Context7 + Privy docs: when paired with `@privy-io/wagmi`'s WagmiProvider,
 * the wagmi `Config` is constructed via `createConfig` and the connectors are
 * implicit (Privy injects them based on its own login methods). We expose the
 * raw chain list so downstream code (kernel client, viem reads) can grab the
 * canonical viem Chain objects.
 */
import { createConfig } from '@privy-io/wagmi';
import { http } from 'viem';
import { mantle, mantleSepoliaTestnet as mantleSepolia } from 'viem/chains';

export const SUPPORTED_CHAINS = [mantleSepolia, mantle] as const;

export const wagmiConfig = createConfig({
  chains: [mantleSepolia, mantle],
  transports: {
    [mantleSepolia.id]: http(
      process.env.NEXT_PUBLIC_MANTLE_SEPOLIA_RPC ?? 'https://rpc.sepolia.mantle.xyz',
    ),
    [mantle.id]: http(process.env.NEXT_PUBLIC_MANTLE_RPC ?? 'https://rpc.mantle.xyz'),
  },
});

export { mantle, mantleSepolia };
