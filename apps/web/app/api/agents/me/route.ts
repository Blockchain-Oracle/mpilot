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
import type { z } from 'zod';
import { verifyPrivyAuth } from '../../../_lib/privyServer';
import { type AgentMeResponse, agentMeResponseSchema } from '../../../_lib/wire';

export const runtime = 'nodejs'; // Privy SDK uses crypto.subtle + Node APIs.

export async function GET(request: Request): Promise<NextResponse> {
  const user = await verifyPrivyAuth(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Missing or invalid Privy access token.', code: 'unauthorized' as const },
      { status: 401 },
    );
  }
  // r4 will replace this with a real `SELECT FROM agents WHERE user_id = $userId`.
  const body: AgentMeResponse = { agent: null };
  // Validate response shape so a drift in the wire schema fails loud in dev.
  const parsed = agentMeResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Wire response failed schema check.', code: 'internal_error' as const },
      { status: 500 },
    );
  }
  return NextResponse.json(parsed.data);
}

// Defensive: future-proof the route by rejecting other methods explicitly.
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Use POST /api/agents to create an agent.', code: 'bad_request' as const },
    { status: 405 },
  );
}
// Compile-time check that wire schemas stay in sync.
void (null as z.infer<typeof agentMeResponseSchema> | null);
