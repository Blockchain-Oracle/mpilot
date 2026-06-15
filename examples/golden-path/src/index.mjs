#!/usr/bin/env node
/**
 * Golden-path runner. For each scenario:
 *   1. Snapshot relevant on-chain balances BEFORE.
 *   2. Build a per-scenario AgentState with the goal text.
 *   3. Run the tick orchestrator end-to-end with real providers, real RPC,
 *      and a real Anthropic model.
 *   4. Snapshot AFTER.
 *   5. Call the scenario's assertion. Pass / fail.
 *
 * Exits 0 if every scenario passes; 1 otherwise.
 */
import 'dotenv/config';
import { mantleMainnet } from '@concierge-mantle/shared';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SCENARIOS } from './scenarios.mjs';

const ANVIL_URL = process.env.ANVIL_URL ?? 'http://127.0.0.1:8546';
const PK = process.env.GOLDEN_PRIVATE_KEY;
if (!PK) {
  console.error('GOLDEN_PRIVATE_KEY missing. Run `pnpm keygen` first.');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY missing in .env.local — the planner needs a real model.');
  process.exit(1);
}

const account = privateKeyToAccount(PK);
const publicClient = createPublicClient({ chain: mantleMainnet, transport: http(ANVIL_URL) });
const walletClient = createWalletClient({
  account,
  chain: mantleMainnet,
  transport: http(ANVIL_URL),
});

console.log(`Golden-path runner`);
console.log(`  EOA:        ${account.address}`);
console.log(`  RPC:        ${ANVIL_URL}`);
console.log(`  scenarios:  ${SCENARIOS.length}`);
console.log('');

// Pre-flight: verify we're on a fork (not the real chain).
const block = await publicClient.getBlockNumber();
console.log(`  forked at block: ${block}`);
if (!ANVIL_URL.includes('127.0.0.1') && !ANVIL_URL.includes('localhost')) {
  console.error(
    'REFUSING to run against a non-local RPC. Real-money runs require explicit --live flag (not yet implemented).',
  );
  process.exit(1);
}

let pass = 0;
let fail = 0;
const results = [];

for (let i = 0; i < SCENARIOS.length; i++) {
  const s = SCENARIOS[i];
  const label = `[${i + 1}/${SCENARIOS.length}] ${s.id}`;
  process.stdout.write(`${label.padEnd(40)} `);

  try {
    // Defer the actual tick wiring until r4-tick lands the worker plumbing.
    // For now, scenarios stub at the snapshot/assert boundary so the harness
    // SHAPE is valid and CI can wire each scenario one by one.
    const before = await s.snapshot({ publicClient, owner: account.address });

    // TODO(r4-tick): replace this with the real tick orchestrator invocation:
    //   const tickResult = await runTick({ goal: s.goal, owner: account, walletClient, publicClient });
    const tickResult = { kind: 'skipped', reason: 'tick orchestrator wiring pending r4-tick' };

    const after = await s.snapshot({ publicClient, owner: account.address });
    const { pass: ok, detail } = await s.assert({ before, after, tickResult });

    results.push({ id: s.id, ok, detail, before, after });
    if (ok) {
      pass++;
      console.log(`PASS  (${detail})`);
    } else {
      fail++;
      console.log(`FAIL  (${detail})`);
    }
  } catch (err) {
    fail++;
    results.push({ id: s.id, ok: false, error: err?.message ?? String(err) });
    console.log(`ERROR (${err?.message ?? err})`);
  }
}

console.log('');
console.log(`Result: ${pass}/${SCENARIOS.length} green${fail ? `, ${fail} failed` : ''}`);
process.exit(fail ? 1 : 0);
