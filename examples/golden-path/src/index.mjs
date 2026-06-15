#!/usr/bin/env node
/**
 * Golden-path runner — REAL Mantle Sepolia.
 *
 * For each scenario:
 *   1. Snapshot relevant on-chain balances BEFORE.
 *   2. Hand the goal + the action-provider tool set to Claude.
 *   3. The model picks a tool, the tool's `invoke` fires the on-chain tx,
 *      we wait for the receipt.
 *   4. Snapshot AFTER.
 *   5. Call the scenario's assertion. Pass / fail.
 *
 * Exits 0 if every scenario passes; 1 otherwise.
 */
import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mantleScanTxUrl } from '@concierge-mantle/sdk';
import { ADDRESSES } from '@concierge-mantle/shared';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantleSepoliaTestnet } from 'viem/chains';
import { runScenario } from './runScenario.mjs';
import { SCENARIOS } from './scenarios.mjs';

// Load apps/worker/.env for the shared ANTHROPIC_API_KEY (the worker's env
// is the canonical home for model secrets per ADR-016).
const workerEnv = resolve(process.cwd(), '../../apps/worker/.env');
if (existsSync(workerEnv)) {
  for (const line of readFileSync(workerEnv, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const RPC_URL = process.env.MANTLE_SEPOLIA_RPC ?? 'https://rpc.sepolia.mantle.xyz';
const PK = process.env.GOLDEN_PRIVATE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!PK) {
  console.error('GOLDEN_PRIVATE_KEY missing. Run `pnpm keygen` first.');
  process.exit(1);
}
if (!ANTHROPIC_KEY || ANTHROPIC_KEY.length < 20) {
  console.error('ANTHROPIC_API_KEY missing or empty. Set it in apps/worker/.env.');
  process.exit(1);
}

const account = privateKeyToAccount(PK);
const publicClient = createPublicClient({
  chain: mantleSepoliaTestnet,
  transport: http(RPC_URL),
});
const walletClient = createWalletClient({
  account,
  chain: mantleSepoliaTestnet,
  transport: http(RPC_URL),
});

// Inject the Sepolia mock addresses into each scenario (the scenarios.mjs
// constants were placeholders for mainnet — Sepolia uses the mock deploy).
const SEPOLIA_TOKENS = {
  USDC: ADDRESSES.mantleSepolia.tokens.USDC,
  WMNT: ADDRESSES.mantleSepolia.tokens.WMNT,
  WETH: ADDRESSES.mantleSepolia.tokens.WETH,
  mETH: ADDRESSES.mantleSepolia.tokens.mETH,
  sUSDe: ADDRESSES.mantleSepolia.tokens.sUSDe,
  USDe: ADDRESSES.mantleSepolia.tokens.USDe,
  USDY: ADDRESSES.mantleSepolia.tokens.USDY,
};

console.log(`Golden-path runner — REAL Mantle Sepolia (chain 5003)`);
console.log(`  EOA:        ${account.address}`);
console.log(`  RPC:        ${RPC_URL}`);
console.log(`  Aave pool:  ${ADDRESSES.mantleSepolia.aave.pool}`);
console.log(`  scenarios:  ${SCENARIOS.length}`);
console.log('');

const block = await publicClient.getBlockNumber();
console.log(`  current block: ${block}`);
console.log('');

let pass = 0;
let fail = 0;

for (let i = 0; i < SCENARIOS.length; i++) {
  const s = SCENARIOS[i];
  const label = `[${i + 1}/${SCENARIOS.length}] ${s.id}`;
  console.log(label);
  console.log(`  goal: ${s.goal}`);

  try {
    const before = await s.snapshot({
      publicClient,
      owner: account.address,
      tokens: SEPOLIA_TOKENS,
    });
    console.log(`  before: ${JSON.stringify(before, jsonBig)}`);

    const t0 = Date.now();
    const result = await runScenario({
      goal: s.goal,
      walletClient,
      publicClient,
      chain: 'mantle-sepolia',
      anthropicKey: ANTHROPIC_KEY,
      tokens: SEPOLIA_TOKENS,
    });
    const dt = Date.now() - t0;
    console.log(
      `  planner: ${result.toolCalls?.length ?? 0} tool call(s), ${result.usage?.inputTokens ?? '?'} → ${result.usage?.outputTokens ?? '?'} tokens, ${dt}ms`,
    );
    for (const call of result.toolCalls ?? []) {
      console.log(`    → ${call.toolName}(${JSON.stringify(call.input)})`);
    }
    for (const r of result.toolResults ?? []) {
      const out = r.output ?? r.result ?? r;
      const tx = out?.txHash;
      if (tx) console.log(`    ↳ tx: ${mantleScanTxUrl(tx, 5003)}`);
    }

    const after = await s.snapshot({
      publicClient,
      owner: account.address,
      tokens: SEPOLIA_TOKENS,
    });
    console.log(`  after:  ${JSON.stringify(after, jsonBig)}`);

    const { pass: ok, detail } = await s.assert({ before, after, planner: result });
    if (ok) {
      pass++;
      console.log(`  PASS  ${detail}`);
    } else {
      fail++;
      console.log(`  FAIL  ${detail}`);
    }
  } catch (err) {
    fail++;
    console.log(`  ERROR ${err?.message ?? err}`);
    if (process.env.DEBUG) console.log(err?.stack ?? '');
  }
  console.log('');
}

console.log(`Result: ${pass}/${SCENARIOS.length} green${fail ? `, ${fail} failed` : ''}`);
process.exit(fail ? 1 : 0);

// JSON.stringify replacer that handles bigint (otherwise throws).
function jsonBig(_k, v) {
  return typeof v === 'bigint' ? v.toString() : v;
}
