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
export type AuthError = 'unauthenticated' | 'unavailable';
export type AuthResult =
  | { readonly ok: true; readonly user: VerifiedUser }
  | { readonly ok: false; readonly reason: AuthError };

const MAX_TOKEN_BYTES = 4096;

export async function verifyPrivyAuth(request: Request): Promise<AuthResult> {
  const header = request.headers.get('authorization');
  if (!header) return { ok: false, reason: 'unauthenticated' };
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) return { ok: false, reason: 'unauthenticated' };
  const token = match[1];
  // Bound parse cost before handing to the SDK.
  if (token.length > MAX_TOKEN_BYTES) return { ok: false, reason: 'unauthenticated' };

  // Config errors (missing env vars) must surface as 500 — they're operator
  // bugs, not auth failures. `getClient()` throws synchronously on missing
  // env, so let it propagate; the route handler catches and 500s.
  const client = getClient();

  try {
    const claims = await client.utils().auth().verifyAccessToken(token);
    const userId = (claims as { userId?: unknown }).userId;
    if (typeof userId !== 'string' || userId.length === 0) {
      return { ok: false, reason: 'unauthenticated' };
    }
    // Defense in depth: assert the token was minted for OUR Privy app.
    // Cross-tenant userId collisions would otherwise be a silent IDOR if
    // the deployment ever shared a Privy app secret with a sibling tenant.
    const appId = (claims as { appId?: unknown }).appId;
    if (typeof appId === 'string' && appId !== process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
      return { ok: false, reason: 'unauthenticated' };
    }
    return { ok: true, user: { userId } };
  } catch (err) {
    // Distinguish: bad signature / expired / malformed → unauthenticated
    // (401); network failure talking to Privy's JWKS → unavailable (503).
    // The SDK throws `Error` for both today, so we name-check the message —
    // `fetch failed`/`network` heuristics are what `@privy-io/node` surfaces.
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (
      msg.includes('network') ||
      msg.includes('fetch failed') ||
      msg.includes('econnrefused') ||
      msg.includes('etimedout')
    ) {
      return { ok: false, reason: 'unavailable' };
    }
    return { ok: false, reason: 'unauthenticated' };
  }
}
