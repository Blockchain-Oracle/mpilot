/**
 * KMS for LLM provider keys (BYOK).
 *
 * Encrypts variable-length plaintext (Anthropic ~108 chars, OpenAI ~50, etc.)
 * with AES-256-GCM. Format: `[12-byte IV][16-byte tag][N-byte ciphertext]`.
 *
 * Per-user key derivation: HKDF-SHA256 over `CONCIERGE_KMS_ROOT` (32-byte
 * hex env var) with `salt = userId` + `info = 'llm-key'`. If the root key
 * is rotated, every user's keys are re-encrypted on next read. If a single
 * ciphertext leaks, the attacker still needs the user-specific derived key.
 *
 * AAD is bound to `{userId, agentId, provider}` so a row swap (an attacker
 * who can `UPDATE llm_keys SET ciphertext=…` from another user's row) fails
 * decrypt — same IDOR mitigation pattern the session-key path uses.
 *
 * The `crypto` module is Node-only. Routes that use this MUST set
 * `export const runtime = 'nodejs';`.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

const IV_BYTES = 12;
const TAG_BYTES = 16;

function getRootKey(): Buffer {
  const hex = process.env.CONCIERGE_KMS_ROOT;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      '[apps/web] CONCIERGE_KMS_ROOT must be a 32-byte hex string. Generate with `openssl rand -hex 32` and set in apps/web/.env.local.',
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * HKDF-SHA256 with no `extract` step — `CONCIERGE_KMS_ROOT` is already a
 * uniformly random 256-bit key, so we go straight to the `expand` step. This
 * matches RFC 5869 §3.3 (no extract when the input is already a uniform key).
 *
 * For 32-byte output, a single HMAC-SHA256 round is enough.
 */
/**
 * Length-prefixed canonical encoding. Privy userIds contain `:` characters
 * (`did:privy:cmqe…`) so a `:`-joined encoding has ambiguity: `did|privy|x:y`
 * collides with `did|privy:x|y`. Length-prefix each component to make the
 * encoding injective — `len(a)||a||len(b)||b||…`. UTF-8 lengths fit in 4
 * bytes since we cap each field upstream.
 */
function lpEncode(parts: ReadonlyArray<string>): Buffer {
  const chunks: Buffer[] = [];
  for (const p of parts) {
    const buf = Buffer.from(p, 'utf8');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(buf.length, 0);
    chunks.push(len, buf);
  }
  return Buffer.concat(chunks);
}

function deriveKey(userId: string): Buffer {
  const root = getRootKey();
  const info = lpEncode(['llm-key', userId]);
  // T(1) = HMAC(root, info || 0x01)
  return createHmac('sha256', root)
    .update(Buffer.concat([info, Buffer.from([0x01])]))
    .digest();
}

function buildAad(parts: { userId: string; agentId: string; provider: string }): Buffer {
  return lpEncode([parts.userId, parts.agentId, parts.provider]);
}

export interface KmsEnvelopeParts {
  readonly userId: string;
  readonly agentId: string;
  readonly provider: string;
}

/** Encrypt a UTF-8 LLM key into a ciphertext buffer suitable for bytea storage. */
export function encryptLlmKey(plaintext: string, parts: KmsEnvelopeParts): Buffer {
  if (plaintext.length === 0 || plaintext.length > 4096) {
    throw new Error('[apps/web/kms] plaintext must be 1..4096 bytes');
  }
  const key = deriveKey(parts.userId);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(buildAad(parts));
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
}

/**
 * Decrypt back to UTF-8. Throws if the AAD or the ciphertext was tampered.
 * The thrown Error intentionally does NOT carry the upstream `cause` because
 * Node crypto's errors can capture envelope bytes / key references via the
 * locals snapshot upstream loggers attach.
 */
export function decryptLlmKey(ciphertext: Buffer, parts: KmsEnvelopeParts): string {
  if (ciphertext.length <= IV_BYTES + TAG_BYTES) {
    throw new Error('[apps/web/kms] ciphertext too short');
  }
  const iv = ciphertext.subarray(0, IV_BYTES);
  const tag = ciphertext.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ct = ciphertext.subarray(IV_BYTES + TAG_BYTES);
  const key = deriveKey(parts.userId);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(buildAad(parts));
  decipher.setAuthTag(tag);
  try {
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf8');
  } catch {
    throw new Error('[apps/web/kms] decryption failed (key tampered, AAD mismatch, or wrong root)');
  }
}
