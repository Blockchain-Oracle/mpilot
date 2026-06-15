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

  const { data, error: queryError } = useQuery<AgentMeResponse>({
    queryKey: ME_QUERY_KEY,
    enabled: ready && authenticated,
    queryFn: async (): Promise<AgentMeResponse> => {
      const token = await getAccessToken();
      if (!token) throw new Error('me_fetch_no_token');
      const res = await fetch('/api/agents/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(
          res.status === 503 ? 'me_fetch_unavailable' : `me_fetch_failed_${res.status}`,
        );
      }
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        // Cloudflare/intermediary HTML pages would otherwise throw inside
        // res.json() with no diagnostic — fail fast with a structured tag.
        throw new Error('me_fetch_non_json');
      }
      const json = await res.json();
      const parsed = agentMeResponseSchema.safeParse(json);
      if (!parsed.success) {
        // Schema drift between client + server — log so it's visible
        // (not silent like the previous `return null` path).
        // biome-ignore lint/suspicious/noConsole: developer-facing observability
        console.error('[AuthGate] me_schema_drift', parsed.error.issues);
        throw new Error('me_schema_drift');
      }
      return parsed.data;
    },
  });

  useEffect(() => {
    if (queryError) {
      // Surface the failure mode so an outage of `/api/agents/me` doesn't
      // present as "infinite loading with no diagnostic." We don't toast
      // here (no toast infra in r2.5); a console.error keeps it visible in
      // dev + accessible to a future error reporter.
      // biome-ignore lint/suspicious/noConsole: developer-facing observability
      console.error('[AuthGate] /api/agents/me query failed:', queryError);
    }
  }, [queryError]);

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
