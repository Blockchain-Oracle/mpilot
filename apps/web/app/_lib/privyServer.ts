/**
 * Server-side Privy auth boundary.
 *
 * Every `/api/*` route that touches user-scoped state MUST call
 * `verifyPrivyAuth(request)` and use the returned `userId` as the ownership
 * key — NEVER trust a wallet address or user id from the request body.
 *
 * Privy's client SDK exposes `getAccessToken()` which returns a short-lived
 * signed access token. The client sends it as `Authorization: Bearer <token>`.
 * The server verifies the signature with our `PRIVY_APP_SECRET` (which never
 * leaves the server) via the `@privy-io/node` SDK's `verifyAccessToken`.
 *
 * Verified per Context7 docs (privy.io 2026-06-15) — `@privy-io/node` is the
 * canonical server SDK; the older `@privy-io/server-auth` package is
 * deprecated and not used.
 */
import { PrivyClient } from '@privy-io/node';

let client: PrivyClient | null = null;

function getClient(): PrivyClient {
  if (client) return client;
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      '[apps/web] Server Privy SDK requires NEXT_PUBLIC_PRIVY_APP_ID + PRIVY_APP_SECRET. Add PRIVY_APP_SECRET to apps/web/.env.local (server-only; never expose).',
    );
  }
  client = new PrivyClient({ appId, appSecret });
  return client;
}

export interface VerifiedUser {
  readonly userId: string;
}

/**
 * Verify the Privy access token on a Next.js Request. Returns `null` on
 * missing/invalid token rather than throwing — call sites decide whether to
 * respond 401 or fall through.
 */
export async function verifyPrivyAuth(request: Request): Promise<VerifiedUser | null> {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) return null;
  const token = match[1];
  try {
    const claims = await getClient().utils().auth().verifyAccessToken(token);
    // The Privy access-token claim shape: `userId` is the canonical user
    // identifier. Type-cast guards against future Privy SDK shape drift.
    const userId = (claims as { userId?: unknown }).userId;
    if (typeof userId !== 'string' || userId.length === 0) return null;
    return { userId };
  } catch {
    // Token signature failed, expired, or malformed. Treat all as unauthenticated.
    return null;
  }
}
