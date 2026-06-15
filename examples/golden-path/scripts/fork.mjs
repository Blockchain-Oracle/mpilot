#!/usr/bin/env node
/**
 * Boot an Anvil fork of Mantle mainnet and mint test balances to the harness
 * EOA. Runs in foreground; ctrl-C to stop.
 *
 * Requires:
 *   - `anvil` on PATH (install via `curl -L https://foundry.paradigm.xyz | bash && foundryup`)
 *   - .env.local with GOLDEN_PRIVATE_KEY + ANVIL_FORK_RPC
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');
if (!existsSync(envPath)) {
  console.error('.env.local missing. Run `pnpm keygen` first.');
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=').map((s) => s.trim())),
);

const PRIVATE_KEY = env.GOLDEN_PRIVATE_KEY;
const FORK_RPC = env.ANVIL_FORK_RPC ?? 'https://rpc.mantle.xyz';
const PORT = env.ANVIL_PORT ?? '8546';

if (!PRIVATE_KEY) {
  console.error('GOLDEN_PRIVATE_KEY missing in .env.local. Run `pnpm keygen` first.');
  process.exit(1);
}

console.log(`Booting Anvil fork of ${FORK_RPC} on port ${PORT}…`);
console.log(`(stop with Ctrl-C)`);
console.log('');

// Fork the chain. --chain-id 5000 keeps the same id so viem chain lookups work.
const proc = spawn(
  'anvil',
  [
    '--fork-url',
    FORK_RPC,
    '--chain-id',
    '5000',
    '--port',
    PORT,
    '--accounts',
    '1',
    '--block-time',
    '2',
  ],
  { stdio: 'inherit' },
);

proc.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => proc.kill('SIGINT'));
process.on('SIGTERM', () => proc.kill('SIGTERM'));
