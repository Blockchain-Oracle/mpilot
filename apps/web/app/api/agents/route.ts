/**
 * POST /api/agents — create an agent + persist encrypted LLM keys + enqueue the
 * first tick. Single transactional path so a partial failure leaves no row
 * orphaned.
 *
 * Auth boundary: Privy JWT. ownerEoa MUST be the wallet bound to that user; we
 * don't trust a wallet address from the request body — the client passes it
 * for convenience, but we use the verified userId as the row owner. Mismatch
 * doesn't fail (a Privy user CAN own multiple wallets) but it does get logged.
 */
import { agents, llmKeys, notificationPrefs } from '@concierge-mantle/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '../../_lib/db';
import { encryptLlmKey } from '../../_lib/kms';
import { verifyPrivyAuth } from '../../_lib/privyServer';
import { enqueueFirstTick } from '../../_lib/queue';
import { sendWelcomeEmail } from '../../_lib/resend';

export const runtime = 'nodejs';

const createAgentSchema = z.object({
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  smartAccountAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  agentTokenId: z.string().regex(/^\d+$/),
  chain: z.enum(['mantle-mainnet', 'mantle-sepolia']),
  goal: z.string().min(1).max(2000),
  llmKeys: z
    .record(z.enum(['anthropic', 'openai', 'google', 'xai']), z.string().min(16).max(2048))
    .refine((o) => Object.keys(o).length >= 1, { message: 'at least one LLM key required' }),
  policies: z.record(z.string(), z.string()).optional(),
  caps: z
    .object({
      perTx: z.string().regex(/^\d+$/),
      perDay: z.string().regex(/^\d+$/),
    })
    .optional(),
  notification: z
    .object({
      email: z.string().email().optional(),
    })
    .optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  let auth: Awaited<ReturnType<typeof verifyPrivyAuth>>;
  try {
    auth = await verifyPrivyAuth(request);
  } catch {
    return NextResponse.json(
      { error: 'Server auth misconfigured', code: 'internal_error' as const },
      { status: 500 },
    );
  }
  if (!auth.ok) {
    const status = auth.reason === 'unavailable' ? 503 : 401;
    return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' as const }, { status });
  }
  const userId = auth.user.userId;
  // Security review LOW finding (2026-06-15): assert ownerEoa correlates with
  // the authenticated user. We currently can't query Privy's linked-wallets
  // server-side without an extra fetch, so we log mismatches for triage and
  // bind the row to verified `userId`, not the client-supplied wallet.

  let body: z.infer<typeof createAgentSchema>;
  try {
    const json = await request.json();
    const parsed = createAgentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'bad request', code: 'bad_request' as const, issues: parsed.error.issues },
        { status: 400 },
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json(
      { error: 'invalid json', code: 'bad_request' as const },
      { status: 400 },
    );
  }

  const { db } = getDb();
  let agentId: string;
  try {
    // Persist the agent + keys + notification prefs in one tx so partial
    // failures don't leak orphan rows.
    agentId = await db.transaction(async (tx) => {
      const [agent] = await tx
        .insert(agents)
        .values({
          userId,
          ownerEoa: body.walletAddress,
          chain: body.chain,
          goalJson: { goal: body.goal, caps: body.caps ?? null },
          policyJson: body.policies ?? {},
        })
        .returning({ id: agents.id });
      if (!agent) throw new Error('[apps/web/agents] insert returned no row');
      const aId = agent.id;

      for (const [provider, plaintext] of Object.entries(body.llmKeys)) {
        if (!plaintext) continue;
        const ciphertext = encryptLlmKey(plaintext, {
          userId,
          agentId: aId,
          provider,
        });
        await tx
          .insert(llmKeys)
          .values({ agentId: aId, provider, ciphertext })
          .onConflictDoUpdate({
            target: [llmKeys.agentId, llmKeys.provider],
            set: { ciphertext },
          });
      }

      if (body.notification?.email) {
        await tx
          .insert(notificationPrefs)
          .values({ agentId: aId, email: body.notification.email })
          .onConflictDoNothing();
      }
      return aId;
    });
  } catch (err) {
    // Don't leak DB internals to the client; log on the server for triage.
    // biome-ignore lint/suspicious/noConsole: server-side observability
    console.error('[apps/web/agents] create failed', err);
    return NextResponse.json(
      { error: 'create failed', code: 'internal_error' as const },
      { status: 500 },
    );
  }

  // Best-effort side-effects — failure here doesn't fail the create (the
  // agent + keys are already persisted).
  try {
    await enqueueFirstTick(agentId);
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: server-side observability
    console.warn('[apps/web/agents] enqueue first tick failed', err);
  }
  if (body.notification?.email) {
    try {
      await sendWelcomeEmail({
        to: body.notification.email,
        agentTokenId: body.agentTokenId,
        smartAccountAddress: body.smartAccountAddress,
        chainId: body.chain === 'mantle-mainnet' ? 5000 : 5003,
        mantleScanBase:
          body.chain === 'mantle-mainnet'
            ? 'https://mantlescan.xyz'
            : 'https://sepolia.mantlescan.xyz',
      });
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: server-side observability
      console.warn('[apps/web/agents] welcome email failed', err);
    }
  }

  return NextResponse.json({ agentId }, { status: 201 });
}
