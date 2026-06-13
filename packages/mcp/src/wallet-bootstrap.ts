// Auto-generate ephemeral wallet config on first stdio bin run. Per the
// pokaldot ~/.portaldot-mcp/config.json pattern: zero-friction first-launch
// for read-only flows. Real Mainnet session-key import (where the user
// pastes a key bound to their on-chain agent) lands in story-138 via MCP
// Elicitation `mode: 'url'`.
//
// Security model:
//   * The generated session key is EPHEMERAL — it is NOT bound to any
//     on-chain agent and CAN'T move funds until story-138's import flow
//     replaces it. It's enough to satisfy the runtime "have a wallet"
//     contract for read tools (get_agent_state / get_reputation / ...).
//   * Config file is written at 0600 + dir at 0700 (CWE-276 lesson from
//     story-150 install.sh).
//   * stdout is RESERVED for MCP JSON-RPC — all logs go to stderr.

import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

const DEFAULT_RPC_URL = 'https://rpc.mantle.xyz';
const DEFAULT_CHAIN_ID = 5000; // Mantle Mainnet

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
  /**
   * Now-source for createdAt — `() => string` ISO-8601. Defaults to wall
   * time; tests inject a fixed source.
   */
  readonly now?: () => string;
}

export function defaultConfigPath(): string {
  return resolve(homedir(), '.concierge', 'config.json');
}

/**
 * Load existing wallet config or generate + persist a fresh one. Idempotent:
 * if the file already exists with a valid shape, returns it unchanged.
 *
 * Errors are LOUD: a corrupt config file throws rather than silently
 * generating over it (the file might hold the user's real session key from
 * story-138's import).
 */
export function bootstrapWallet(opts: BootstrapOpts = {}): WalletConfig {
  const configPath = opts.configPath ?? defaultConfigPath();
  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = parseConfig(raw);
    if (parsed === null) {
      throw new Error(
        `[@concierge/mcp] wallet-bootstrap: config at ${configPath} exists but is malformed. Refusing to overwrite. Move or delete it manually.`,
      );
    }
    return parsed;
  }

  const now = opts.now ?? (() => new Date().toISOString());
  const fresh: WalletConfig = {
    sessionKey: generateSessionKey(),
    rpcUrl: opts.rpcUrl ?? process.env['CONCIERGE_RPC_URL'] ?? DEFAULT_RPC_URL,
    chainId: opts.chainId ?? DEFAULT_CHAIN_ID,
    agentId: null,
    createdAt: now(),
  };

  // CWE-276: tighten perms BEFORE write. 0700 on dir + 0600 on file.
  const dir = dirname(configPath);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  writeFileSync(configPath, `${JSON.stringify(fresh, null, 2)}\n`, { mode: 0o600 });
  chmodSync(configPath, 0o600);
  return fresh;
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
 * Environment check for the AI model provider key. Exit code 2 with a
 * pointed stderr message if NONE of the recognized env vars are set AND
 * AI_MODEL isn't configured. Stdout stays clean — reserved for MCP traffic.
 */
export function assertModelEnvOrExit(): void {
  const provider = process.env['AI_MODEL'] ?? '';
  if (provider !== '') return; // user explicitly chose a model

  const keys = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'XAI_API_KEY',
  ];
  if (keys.some((k) => (process.env[k] ?? '') !== '')) return;

  process.stderr.write(
    `[concierge-mcp] FATAL: no AI model configured. Set one of ${keys.join(' / ')} or AI_MODEL="provider:model".\n`,
  );
  process.exit(2);
}
