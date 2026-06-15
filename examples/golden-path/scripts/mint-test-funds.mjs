#!/usr/bin/env node
/**
 * Mint mock tokens to the harness EOA. Run once after DeployAll lands the
 * mocks — the EOA was the deployer so it holds MINTER_ROLE.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ADDRESSES } from '@concierge-mantle/shared';
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  parseAbi,
  parseUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantleSepoliaTestnet } from 'viem/chains';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const PK = process.env.GOLDEN_PRIVATE_KEY;
if (!PK) {
  console.error('GOLDEN_PRIVATE_KEY missing.');
  process.exit(1);
}

const account = privateKeyToAccount(PK);
const publicClient = createPublicClient({
  chain: mantleSepoliaTestnet,
  transport: http('https://rpc.sepolia.mantle.xyz'),
});
const walletClient = createWalletClient({
  account,
  chain: mantleSepoliaTestnet,
  transport: http('https://rpc.sepolia.mantle.xyz'),
});

const abi = parseAbi(['function mint(address to, uint256 amount)']);

const mints = [
  { name: 'USDC', address: ADDRESSES.mantleSepolia.tokens.USDC, decimals: 6, amount: '1000' },
  { name: 'WMNT', address: ADDRESSES.mantleSepolia.tokens.WMNT, decimals: 18, amount: '500' },
  { name: 'sUSDe', address: ADDRESSES.mantleSepolia.tokens.sUSDe, decimals: 18, amount: '500' },
  { name: 'USDe', address: ADDRESSES.mantleSepolia.tokens.USDe, decimals: 18, amount: '500' },
  { name: 'USDY', address: ADDRESSES.mantleSepolia.tokens.USDY, decimals: 18, amount: '500' },
  { name: 'mETH', address: ADDRESSES.mantleSepolia.tokens.mETH, decimals: 18, amount: '10' },
];

console.log(`Minting test funds to ${account.address}…`);
for (const m of mints) {
  const amt = parseUnits(m.amount, m.decimals);
  try {
    const hash = await walletClient.writeContract({
      address: m.address,
      abi,
      functionName: 'mint',
      args: [account.address, amt],
    });
    const rec = await publicClient.waitForTransactionReceipt({ hash });
    console.log(
      `  ${m.name.padEnd(6)} ${m.amount.padStart(6)} → ${rec.status} (${hash.slice(0, 10)}…)`,
    );
  } catch (err) {
    console.log(`  ${m.name.padEnd(6)} FAILED: ${err?.shortMessage ?? err?.message ?? err}`);
  }
}

console.log('');
console.log('Verifying balances:');
const erc20 = parseAbi(['function balanceOf(address) view returns (uint256)']);
for (const m of mints) {
  const bal = await publicClient.readContract({
    address: m.address,
    abi: erc20,
    functionName: 'balanceOf',
    args: [account.address],
  });
  console.log(`  ${m.name.padEnd(6)} ${formatUnits(bal, m.decimals)}`);
}
