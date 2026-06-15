/**
 * POST /api/llm-verify — proxies a model-list call to the named LLM provider to
 * verify that the user's BYOK key works. The key is held in memory for the
 * duration of the request only; the encrypted persistence happens in r4 via
 * a separate POST /api/agents which receives the verified key.
 *
 * Rate-limited by the verified Privy `userId` so an attacker can't brute-force
 * provider keys through this proxy. The limit is intentionally low (10/min/
 * userId) because legitimate users only call this on each provider tile
 * change.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPrivyAuth } from '../../_lib/privyServer';
import { type ProviderId, validate } from './_validators';

export const runtime = 'nodejs';

const requestSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'google', 'xai']),
  // Provider key shapes vary; only sanity-check length to bound abuse.
  key: z.string().min(16).max(512),
});

// Tiny in-memory rate limiter — sufficient for dev + the demo. Production
// swaps for a Redis token bucket once we boot apps/web on multiple instances.
const RATE: Map<string, { count: number; resetAt: number }> = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;

function checkRate(userId: string): boolean {
  const now = Date.now();
  const entry = RATE.get(userId);
  if (!entry || entry.resetAt < now) {
    RATE.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count += 1;
  return true;
}

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
    return NextResponse.json({ error: auth.reason, code: 'unauthorized' as const }, { status });
  }
  if (!checkRate(auth.user.userId)) {
    return NextResponse.json(
      { error: 'too many verifications; try again in a minute', code: 'rate_limited' as const },
      { status: 429 },
    );
  }
  let body: { provider: ProviderId; key: string };
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'bad request', code: 'bad_request' as const },
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
  try {
    const result = await validate(body.provider, body.key);
    // Critical: response NEVER echoes the key, request body, or the request
    // headers. Only the provider's pass/fail signal + (on success) the model
    // count surfaces.
    return NextResponse.json(result);
  } catch (err) {
    // Network/parse failure talking to the provider. We surface a generic
    // failure without the upstream URL or error chain — they may contain
    // path fragments + headers we don't want in logs.
    return NextResponse.json(
      {
        ok: false as const,
        reason: err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'upstream error',
      },
      { status: 502 },
    );
  }
}
