// Auto-generate ephemeral wallet config on first stdio bin run. Per the
// pokaldot ~/.portaldot-mcp/config.json pattern: zero-friction first-launch
// for read-only flows. Real Mainnet session-key import (story-138 via
// Elicitation `mode: 'url'`) lands later and overwrites the ephemeral key.

import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

const DEFAULT_RPC_URL = 'https://rpc.mantle.xyz';
const DEFAULT_CHAIN_ID = 5000; // Mantle Mainnet

const PROVIDER_KEY_MAP: Readonly<Record<string, string>> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  xai: 'XAI_API_KEY',
};

/** Round-2 CWE-345: only http(s) origins; no quotes/newlines that could
 *  inject hostile JSON or be smuggled past downstream consumers. */
const RPC_URL_RE = /^https?:\/\/[A-Za-z0-9.-]+(:[0-9]{1,5})?(\/[A-Za-z0-9._~/-]*)?$/;

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
  readonly configPath?: string;
  readonly rpcUrl?: string;
  readonly chainId?: number;
  readonly now?: () => string;
}

export function defaultConfigPath(): string {
  return resolve(homedir(), '.concierge', 'config.json');
}

/**
 * Load existing wallet config or generate + persist a fresh one. Atomic via
 * tmp+rename so a crash between `openSync` and `writeFileSync` can't leave
 * an empty file that bricks subsequent runs (round-2 code IMPORTANT).
 *
 * Idempotent on second call: returns the on-disk config. Throws on malformed
 * shape — the file might hold the user's real session key from story-138.
 */
export function bootstrapWallet(opts: BootstrapOpts = {}): WalletConfig {
  const configPath = opts.configPath ?? defaultConfigPath();

  const existing = tryReadConfig(configPath);
  if (existing !== null) return existing;

  const dir = dirname(configPath);
  ensureDirPerms(dir);

  const now = opts.now ?? (() => new Date().toISOString());
  const rpcUrl = opts.rpcUrl ?? process.env['CONCIERGE_RPC_URL'] ?? DEFAULT_RPC_URL;
  if (!RPC_URL_RE.test(rpcUrl)) {
    throw new Error(
      `[@concierge-mantle/mcp] wallet-bootstrap: CONCIERGE_RPC_URL has hostile shape (got '${rpcUrl.slice(0, 64)}'). Expected http(s) origin.`,
    );
  }

  const fresh: WalletConfig = {
    sessionKey: generateSessionKey(),
    rpcUrl,
    chainId: opts.chainId ?? DEFAULT_CHAIN_ID,
    agentId: null,
    createdAt: now(),
  };
  const serialized = `${JSON.stringify(fresh, null, 2)}\n`;

  // Round-2 IMPORTANT (atomicity): tmp+rename. openSync(wx) on the tmp gives
  // us O_EXCL semantics for the create race; rename publishes atomically.
  // A crash before rename leaves a stray tmp file (cleaned on next attempt)
  // rather than an empty config that bricks the bin.
  const tmpPath = `${configPath}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  try {
    const fd = openSync(tmpPath, 'wx', 0o600);
    writeFileSync(fd, serialized);
    chmodSync(tmpPath, 0o600);
    try {
      renameSync(tmpPath, configPath);
    } catch (renameErr) {
      const e = renameErr as NodeJS.ErrnoException;
      // EEXIST on rename → another process won the race AFTER we wrote our
      // tmp. Clean up + re-read the winner's config.
      if (e.code === 'EEXIST' || e.code === 'ENOTEMPTY') {
        safeUnlink(tmpPath);
        const winner = tryReadConfig(configPath);
        if (winner !== null) return winner;
        throw wrapWalletErr(e, 'rename winner-config tmp → final', configPath);
      }
      safeUnlink(tmpPath);
      throw wrapWalletErr(e, 'rename tmp → final', configPath);
    }
    chmodSync(configPath, 0o600);
    return fresh;
  } catch (err) {
    // Round-2 silent-failure MEDIUM: thin context on EROFS/EACCES. Wrap with
    // wallet-bootstrap prefix + path so the user knows the failure layer.
    safeUnlink(tmpPath);
    if (err instanceof Error && err.message.startsWith('[@concierge-mantle/mcp]')) throw err;
    throw wrapWalletErr(err, 'create config', configPath);
  }
}

function wrapWalletErr(err: unknown, op: string, path: string): Error {
  const code = (err as NodeJS.ErrnoException).code ?? 'unknown';
  const msg = err instanceof Error ? err.message : String(err);
  return new Error(
    `[@concierge-mantle/mcp] wallet-bootstrap: ${op} at ${path} failed (${code}): ${msg}`,
  );
}

function safeUnlink(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    /* tmp may not exist if openSync itself failed */
  }
}

/**
 * Round-2 silent-failure HIGH: round-1 only tightened newly-created dirs.
 * A stale 0755 ~/.concierge from a prior install would silently permit
 * world-listing of future story-138 artifacts. Now: always stat + tighten +
 * stderr-warn if the directory had loose group/other bits.
 */
function ensureDirPerms(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  let mode: number;
  try {
    mode = statSync(dir).mode & 0o777;
  } catch {
    chmodSync(dir, 0o700);
    return;
  }
  if ((mode & 0o077) !== 0) {
    try {
      process.stderr.write(
        `[concierge-mcp] WARNING: tightening ${dir} permissions from 0${mode.toString(8)} to 0700 (group/other bits were set).\n`,
      );
    } catch {
      /* stderr closed; skip log */
    }
    chmodSync(dir, 0o700);
  } else if (mode !== 0o700) {
    chmodSync(dir, 0o700);
  }
}

function tryReadConfig(configPath: string): WalletConfig | null {
  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf-8');
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') return null;
    throw wrapWalletErr(e, 'read config', configPath);
  }
  const parsed = parseConfig(raw);
  if (parsed === null) {
    throw new Error(
      `[@concierge-mantle/mcp] wallet-bootstrap: config at ${configPath} exists but is malformed. Refusing to overwrite. Move or delete it manually.`,
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
  // Round-2 CWE-345: validate rpcUrl shape so a winner-config race injection
  // can't redirect chain reads to attacker infra.
  if (!RPC_URL_RE.test(rpcUrl)) return null;
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
 * If AI_MODEL is set, require the MATCHING provider key (round-1). Else any
 * provider key suffices and the default model is anthropic.
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

  // Round-2 simplification: inline Object.values; drop the ALL_PROVIDER_KEYS cache.
  const keys = Object.values(PROVIDER_KEY_MAP);
  if (keys.some((k) => (process.env[k] ?? '') !== '')) return;
  process.stderr.write(
    `[concierge-mcp] FATAL: no AI model configured. Set one of ${keys.join(' / ')} or AI_MODEL="provider:model".\n`,
  );
  process.exit(2);
}
