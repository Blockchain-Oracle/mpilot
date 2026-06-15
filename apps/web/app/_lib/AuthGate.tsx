'use client';

import { usePrivy } from '@privy-io/react-auth';
/**
 * Returning-user gate.
 *
 * On every authenticated page load we ask `/api/agents/me` "does this user
 * have an agent yet?". The answer routes the user:
 *
 *   - `agent === null`         → onboarding wizard (current default)
 *   - `agent.smartAccountAddress && !agent.agentTokenId` → onboarding/identity (resume mid-flow)
 *   - `agent.status === 'active'` → /app dashboard
 *
 * The gate runs ONLY redirect side-effects, never render-gates the children —
 * the landing page must always render immediately even if the gate is still
 * fetching, so first-paint stays fast.
 *
 * Middleware cannot do this work: middleware runs in the Edge runtime and
 * has no access to Privy's client-side session. The check is intentionally
 * client-side and after-hydration (verified via Context7).
 */
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { ME_QUERY_KEY } from './queryClient';
import { type AgentMeResponse, agentMeResponseSchema } from './wire';

export function AuthGate({ children }: { readonly children: ReactNode }) {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();

  const { data } = useQuery<AgentMeResponse | null>({
    queryKey: ME_QUERY_KEY,
    enabled: ready && authenticated,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) return null;
      const res = await fetch('/api/agents/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      const parsed = agentMeResponseSchema.safeParse(json);
      return parsed.success ? parsed.data : null;
    },
  });

  useEffect(() => {
    if (!ready || !authenticated || !data) return;
    const agent = data.agent;

    if (agent === null) {
      // No agent yet — route to onboarding if on landing.
      if (pathname === '/') router.replace('/onboarding');
      return;
    }

    // Has an agent. Resume-mid-flow logic:
    if (agent.smartAccountAddress && !agent.agentTokenId) {
      if (!pathname.startsWith('/onboarding')) router.replace('/onboarding');
      return;
    }

    // Fully provisioned — route to /app if currently on landing/onboarding.
    if (agent.status === 'active') {
      if (pathname === '/' || pathname.startsWith('/onboarding')) router.replace('/app');
    }
  }, [ready, authenticated, data, pathname, router]);

  return <>{children}</>;
}
