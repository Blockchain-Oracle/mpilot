#!/usr/bin/env node
import { execSync } from 'node:child_process';
/**
 * Reads the Foundry broadcast artifact for DeployAll.s.sol and updates
 * packages/shared/src/addresses.ts with the deployed Sepolia addresses.
 *
 * Usage:
 *   node contracts/scripts/write-addresses.mjs [--network sepolia]
 *
 * Reads: contracts/broadcast/DeployAll.s.sol/5003/run-latest.json
 * Writes: packages/shared/src/addresses.ts  (mantleSepolia block only)
 *
 * Each field is updated with a targeted replacement that matches the
 * field name + its current value (ZERO_ADDRESS or an existing 0x address),
 * so the script is idempotent and safe to re-run on updated deployments.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const CHAIN_ID = '5003';

const artifactPath = resolve(
  __dirname,
  '..',
  'broadcast',
  'DeployAll.s.sol',
  CHAIN_ID,
  'run-latest.json',
);
const addressesPath = resolve(REPO_ROOT, 'packages', 'shared', 'src', 'addresses.ts');

// --- Read broadcast artifact ---

let artifact;
try {
  artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
} catch (err) {
  console.error(`Cannot read broadcast artifact at ${artifactPath}`);
  console.error(
    'Run: forge script script/DeployAll.s.sol --rpc-url $MANTLE_SEPOLIA_RPC_URL --broadcast',
  );
  process.exit(1);
}

// Build contractName → contractAddress from CREATE transactions (first occurrence wins)
/** @type {Record<string, string>} */
const deployed = {};
for (const tx of artifact.transactions ?? []) {
  if (
    tx.transactionType === 'CREATE' &&
    tx.contractName &&
    tx.contractAddress &&
    !deployed[tx.contractName]
  ) {
    deployed[tx.contractName] = tx.contractAddress;
  }
}

// --- Map Solidity contract names to addresses.ts field names ---

// Each entry: [Solidity contract name, leaf field name in addresses.ts mantleSepolia block]
const CONTRACT_FIELD_MAP = [
  ['MockAavePool', 'pool'],
  ['MockAaveOracle', 'oracle'],
  ['MockSUSDe', 'sUSDe'],
  ['MockUSDC', 'USDC'],
  ['MockUSDe', 'USDe'],
  ['MockUSDY', 'USDY'],
  ['MockMETH', 'mETH'],
  ['MockWMNT', 'WMNT'],
  ['ConciergeRegistryProxy', 'conciergeRegistry'],
];

const updates = CONTRACT_FIELD_MAP.flatMap(([contractName, fieldName]) => {
  const addr = deployed[contractName];
  if (!addr) {
    console.warn(`  ⚠ ${contractName} not found in broadcast artifact — skipping`);
    return [];
  }
  return [{ contractName, fieldName, addr }];
});

if (updates.length === 0) {
  console.error('No matching contracts found in broadcast artifact. Aborting.');
  process.exit(1);
}

// --- Update addresses.ts with targeted field replacements ---

let content = readFileSync(addressesPath, 'utf8');
const original = content;

// ADDRESS_RE matches: `ZERO_ADDRESS` or `'0xABCD…1234' as Address`
const ADDRESS_RE = `(ZERO_ADDRESS|'0x[a-fA-F0-9]{40}'(?:\\s+as\\s+Address)?)`;

for (const { contractName, fieldName, addr } of updates) {
  // Anchored pattern: match the field name followed by a colon, then the current address value.
  // The word boundary \b prevents matching substrings of longer identifiers.
  const re = new RegExp(`(\\b${fieldName}:\\s*)${ADDRESS_RE}`, 'g');
  const next = content.replace(re, `$1'${addr}' as Address`);
  if (next === content) {
    console.warn(`  ⚠ Field '${fieldName}' not found in addresses.ts (contract: ${contractName})`);
  } else {
    console.log(`  ✓ ${contractName} → ${fieldName}: ${addr}`);
    content = next;
  }
}

if (content === original) {
  console.log('addresses.ts already up to date — no changes written.');
} else {
  writeFileSync(addressesPath, content, 'utf8');
  console.log(`\nWrote: ${addressesPath}`);

  // Verify the updated file still typechecks
  console.log('Running pnpm typecheck…');
  try {
    execSync('pnpm run typecheck', { cwd: REPO_ROOT, stdio: 'inherit' });
    console.log('typecheck passed ✓');
  } catch {
    console.error('typecheck FAILED — reverting addresses.ts');
    writeFileSync(addressesPath, original, 'utf8');
    process.exit(1);
  }
}
