#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts';

const envPath = resolve(process.cwd(), '.env.local');
const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';

if (/^GOLDEN_PRIVATE_KEY=/m.test(existing)) {
  console.error(
    'GOLDEN_PRIVATE_KEY already set in .env.local. Remove it manually if you want to rotate.',
  );
  process.exit(1);
}

const key = generatePrivateKey();
const addr = privateKeyToAddress(key);

writeFileSync(
  envPath,
  `${existing}${existing.endsWith('\n') || existing === '' ? '' : '\n'}GOLDEN_PRIVATE_KEY=${key}\n`,
);

console.log(`Generated fresh test EOA.`);
console.log(`  Address: ${addr}`);
console.log(`  Key:     ${key.slice(0, 6)}…${key.slice(-4)}  (full key in .env.local)`);
console.log(``);
console.log(
  `Next: boot Anvil with \`pnpm fork\` — the fork script will mint balances to this address.`,
);
