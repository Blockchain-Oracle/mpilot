/**
 * Promoted react-query client. Previously instantiated inline in
 * `PrivyProviders.tsx`; lifted here so the logout helper can call
 * `queryClient.removeQueries({ queryKey: ['me'] })` on Privy logout without
 * yanking the entire wagmi/Privy cache.
 *
 * Per @tanstack/react-query Next.js guidance + Context7-verified: one client
 * per mount (memoized in PrivyProviders) so React Strict Mode's double-mount
 * doesn't share state across instances.
 */
import { QueryClient } from '@tanstack/react-query';

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 30s stale-while-revalidate per plan D7 — covers tab focus / nav.
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  });
}

export const ME_QUERY_KEY = ['me'] as const;
