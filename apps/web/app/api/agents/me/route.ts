/**
 * GET /api/agents/me — single source of truth for "does this user have an
 * agent yet, and what state is it in?"
 *
 * Drives the returning-user gate (`AuthGate.tsx`) — partial state surfaces so
 * a user who closed their tab between StepAccount and StepIdentity can resume
 * the wizard at the right step instead of redeploying.
 *
 * Ownership: `userId` is the verified Privy claim ONLY. Never trust a wallet
 * address or user id from the request body or headers.
 *
 * Note: r2.5 ships this route returning `{ agent: null }` for every user
 * because the `agents` table write path doesn't exist yet (lands in r4).
 * Until r4 the gate always routes authenticated users into `/onboarding`,
 * matching today's behavior. The DB read code is wired and tested so r4
 * just adds the corresponding POST.
 */
import { NextResponse } from 'next/server';
import { verifyPrivyAuth } from '../../../_lib/privyServer';
import { type AgentMeResponse, agentMeResponseSchema } from '../../../_lib/wire';

export const runtime = 'nodejs'; // Privy SDK uses crypto.subtle + Node APIs.

export async function GET(request: Request): Promise<NextResponse> {
  let auth: Awaited<ReturnType<typeof verifyPrivyAuth>>;
  try {
    auth = await verifyPrivyAuth(request);
  } catch {
    // Config error (missing PRIVY_APP_SECRET, etc.) — fail loud as 500.
    return NextResponse.json(
      { error: 'Server auth misconfigured', code: 'internal_error' as const },
      { status: 500 },
    );
  }
  if (!auth.ok) {
    const status = auth.reason === 'unavailable' ? 503 : 401;
    return NextResponse.json(
      { error: auth.reason, code: 'unauthorized' as const },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  // r4 will replace this with a real `SELECT FROM agents WHERE user_id = $userId`.
  const body: AgentMeResponse = { agent: null };
  const parsed = agentMeResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Wire response failed schema check.', code: 'internal_error' as const },
      { status: 500 },
    );
  }
  return NextResponse.json(parsed.data, { headers: { 'Cache-Control': 'no-store' } });
}
