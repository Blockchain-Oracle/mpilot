/**
 * r2 — wires the onboarding flow to the production `@concierge-mantle/smart-account`
 * package (ZeroDev kernel + Pimlico paymaster).
 *
 * The wallet we get from Privy is an EIP-1193 provider (browser-side
 * signer); `createConciergeAccount` expects a viem `LocalAccount`-shaped
 * object as `owner`. At runtime the ZeroDev `signerToEcdsaValidator` only
 * touches `account.signMessage`, which both `LocalAccount` and viem's
 * `JsonRpcAccount` implement — so we build a viem `WalletClient` from the
 * Privy provider and pass `walletClient.account` through with a structural
 * cast at the type-system boundary.
 */
import { type ConciergeAccount, createConciergeAccount } from '@concierge-mantle/smart-account/web';
import type { WalletClient } from 'viem';

export interface DeployArgs {
  readonly walletClient: WalletClient;
  /** Mantle Sepolia (chain 5003) only for now; r2 ships on Sepolia. */
  readonly chain: 'mantle-sepolia';
  /** Pimlico API key. Defaults to `process.env.NEXT_PUBLIC_PIMLICO_API_KEY`. */
  readonly apiKey?: string;
}

export async function deployConciergeAccount(args: DeployArgs): Promise<ConciergeAccount> {
  const apiKey = args.apiKey ?? process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
  if (!apiKey) {
    throw new Error(
      '[apps/web] NEXT_PUBLIC_PIMLICO_API_KEY is not set. Add it to apps/web/.env.local before deploying a smart account.',
    );
  }
  const account = args.walletClient.account;
  if (!account) {
    throw new Error(
      '[apps/web] WalletClient has no account bound. Did the Privy connect flow finish?',
    );
  }
  // Cast bridges TWO things at once:
  //   1. viem JsonRpcAccount (browser wallet via EIP-1193) → LocalAccount
  //      (the worker path uses a private-key signer; the web path goes
  //      through the user's provider, which is structurally compatible
  //      with what signerToEcdsaValidator reads — `.signMessage`).
  //   2. Cross-version viem type drift: the workspace has two installed
  //      viem@2.52.2 copies (one under TS 5.9.3 for apps/web, one under
  //      TS 6.0.3 for the package builds). Same package, different paths,
  //      TS treats the types as unrelated.
  // biome-ignore lint/suspicious/noExplicitAny: structural bridge — see above
  return createConciergeAccount({
    owner: account as any,
    chain: args.chain,
    paymaster: 'pimlico',
    apiKey,
  });
}
