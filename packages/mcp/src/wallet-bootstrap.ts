// Auto-generate ephemeral wallet config on first stdio bin run. Per the
// pokaldot ~/.portaldot-mcp/config.json pattern: zero-friction first-launch
// for read-only flows. Real Mainnet session-key import (story-138 via
// Elicitation `mode: 'url'`) lands later and overwrites the ephemeral key.

import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

const DEFAULT_RPC_URL = 'https://rpc.mantle.xyz';
const DEFAULT_CHAIN_ID = 5000; // Mantle Mainnet

/** Round-1 silent-failure HIGH fix: map AI_MODEL prefix → required env var. */
const PROVIDER_KEY_MAP: Readonly<Record<string, string>> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  xai: 'XAI_API_KEY',
};
const ALL_PROVIDER_KEYS: ReadonlyArray<string> = Object.values(PROVIDER_KEY_MAP);

export interface WalletConfig {
  /** Hex 32-byte private key (ephemeral; not bound to an on-chain agent yet). */
  readonly sessionKey: `0x${string}`;
  readonly rpcUrl: string;
  readonly chainId: number;
  /** Placeholder agent id slot — story-138's import flow populates this. */
  readonly agentId: string | null;
  readonly createdAt: string;
}

export interface BootstrapOpts {
  /** Override the config path (defaults to ~/.concierge/config.json). */
  readonly configPath?: string;
  /** Override the RPC URL (env: CONCIERGE_RPC_URL). */
  readonly rpcUrl?: string;
  /** Override the chain id (default 5000 — Mantle Mainnet). */
  readonly chainId?: number;
  /** Now-source for createdAt — tests inject a fixed source. */
  readonly now?: () => string;
}

export function defaultConfigPath(): string {
  return resolve(homedir(), '.concierge', 'config.json');
}

/**
 * Load existing wallet config or generate + persist a fresh one. Idempotent
 * and ATOMIC: uses `open(O_WRONLY|O_CREAT|O_EXCL)` so two parallel bin
 * invocations (Claude Desktop + Cursor first-launch race) can't both
 * generate over each other. The loser of the race re-reads.
 *
 * A malformed config file THROWS rather than silently regenerating — the
 * file might hold the user's real session key from story-138's import flow.
 */
export function bootstrapWallet(opts: BootstrapOpts = {}): WalletConfig {
  const configPath = opts.configPath ?? defaultConfigPath();

  // Fast path: file already exists, parse + return.
  const existing = tryReadConfig(configPath);
  if (existing !== null) return existing;

  // Round-1: only chmod the dedicated dir when it was newly created here.
  // If `configPath` is overridden to a nested path (tests, custom hosts),
  // we still need the parent to exist but won't tighten an unrelated dir.
  const dir = dirname(configPath);
  const dirExistedBefore = existsSync(dir);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (!dirExistedBefore) {
    chmodSync(dir, 0o700);
  }

  const now = opts.now ?? (() => new Date().toISOString());
  const fresh: WalletConfig = {
    sessionKey: generateSessionKey(),
    rpcUrl: opts.rpcUrl ?? process.env['CONCIERGE_RPC_URL'] ?? DEFAULT_RPC_URL,
    chainId: opts.chainId ?? DEFAULT_CHAIN_ID,
    agentId: null,
    createdAt: now(),
  };
  const serialized = `${JSON.stringify(fresh, null, 2)}\n`;

  // Round-1 CRITICAL (TOCTOU): atomic create. wx mode (O_WRONLY|O_CREAT|O_EXCL)
  // FAILS with EEXIST if another process wrote between our existsSync and
  // here — we then re-read THEIR config rather than overwriting (which would
  // discard a possibly-imported real session key from story-138 later).
  try {
    const fd = openSync(configPath, 'wx', 0o600);
    writeFileSync(fd, serialized);
    chmodSync(configPath, 0o600);
    return fresh;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'EEXIST') {
      const winnerConfig = tryReadConfig(configPath);
      if (winnerConfig !== null) return winnerConfig;
      throw new Error(
        `[@concierge/mcp] wallet-bootstrap: race winner wrote a malformed config at ${configPath}. Refusing to overwrite.`,
      );
    }
    throw err;
  }
}

function tryReadConfig(configPath: string): WalletConfig | null {
  // Round-1 (silent-failure #1 cosmetic): single try/catch on read avoids the
  // existsSync→readFileSync TOCTOU. ENOENT → null; other errors propagate.
  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf-8');
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') return null;
    throw err;
  }
  const parsed = parseConfig(raw);
  if (parsed === null) {
    throw new Error(
      `[@concierge/mcp] wallet-bootstrap: config at ${configPath} exists but is malformed. Refusing to overwrite. Move or delete it manually.`,
    );
  }
  return parsed;
}

function generateSessionKey(): `0x${string}` {
  return `0x${randomBytes(32).toString('hex')}` as const;
}

function parseConfig(raw: string): WalletConfig | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const sessionKey = obj['sessionKey'];
  const rpcUrl = obj['rpcUrl'];
  const chainId = obj['chainId'];
  const agentId = obj['agentId'];
  const createdAt = obj['createdAt'];
  if (typeof sessionKey !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(sessionKey)) return null;
  if (typeof rpcUrl !== 'string') return null;
  if (typeof chainId !== 'number' || !Number.isInteger(chainId)) return null;
  if (agentId !== null && typeof agentId !== 'string') return null;
  if (typeof createdAt !== 'string') return null;
  return {
    sessionKey: sessionKey as `0x${string}`,
    rpcUrl,
    chainId,
    agentId,
    createdAt,
  };
}

/**
 * Round-1 silent-failure HIGH fix: if AI_MODEL is set, require the MATCHING
 * provider key, not just any key. Round-0 returned silently when AI_MODEL was
 * set, deferring "no OPENAI_API_KEY" crashes to first inference — false
 * assurance.
 *
 * Exit code 2 + stderr message. Stdout stays clean (reserved for MCP).
 */
export function assertModelEnvOrExit(): void {
  const aiModel = process.env['AI_MODEL'] ?? '';

  if (aiModel !== '') {
    const colon = aiModel.indexOf(':');
    const provider = colon >= 0 ? aiModel.slice(0, colon) : aiModel;
    const requiredKey = PROVIDER_KEY_MAP[provider];
    if (requiredKey === undefined) {
      process.stderr.write(
        `[concierge-mcp] FATAL: AI_MODEL="${aiModel}" references unknown provider "${provider}". Supported: ${Object.keys(PROVIDER_KEY_MAP).join(', ')}.\n`,
      );
      process.exit(2);
    }
    if ((process.env[requiredKey] ?? '') === '') {
      process.stderr.write(
        `[concierge-mcp] FATAL: AI_MODEL="${aiModel}" requires ${requiredKey} to be set.\n`,
      );
      process.exit(2);
    }
    return;
  }

  // No AI_MODEL — any provider key suffices, default model is anthropic.
  if (ALL_PROVIDER_KEYS.some((k) => (process.env[k] ?? '') !== '')) return;
  process.stderr.write(
    `[concierge-mcp] FATAL: no AI model configured. Set one of ${ALL_PROVIDER_KEYS.join(' / ')} or AI_MODEL="provider:model".\n`,
  );
  process.exit(2);
}
