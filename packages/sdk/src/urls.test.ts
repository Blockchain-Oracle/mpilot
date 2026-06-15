import { describe, expect, it } from 'vitest';
import {
  agentShareUrl,
  attestationIpfsUrl,
  attestationMantleScanUrl,
  mantleScanAddressUrl,
  mantleScanTxUrl,
} from './urls.ts';

const SEPOLIA = 5003;
const MAINNET = 5000;
const TX: `0x${string}` = `0x${'ab'.repeat(32)}`;
const ADDR: `0x${string}` = '0x0000000000000000000000000000000000000001';

describe('mantleScanTxUrl', () => {
  it('routes Sepolia to sepolia.mantlescan.xyz', () => {
    expect(mantleScanTxUrl(TX, SEPOLIA)).toBe(`https://sepolia.mantlescan.xyz/tx/${TX}`);
  });
  it('routes Mainnet to mantlescan.xyz', () => {
    expect(mantleScanTxUrl(TX, MAINNET)).toBe(`https://mantlescan.xyz/tx/${TX}`);
  });
  it('throws on unsupported chain', () => {
    expect(() => mantleScanTxUrl(TX, 1)).toThrow(/Unsupported chainId/);
  });
});

describe('mantleScanAddressUrl', () => {
  it('routes address to the right host', () => {
    expect(mantleScanAddressUrl(ADDR, MAINNET)).toBe(`https://mantlescan.xyz/address/${ADDR}`);
  });
});

describe('attestationMantleScanUrl', () => {
  it('links to the attestation tx by feedback hash', () => {
    expect(attestationMantleScanUrl(TX, SEPOLIA)).toBe(`https://sepolia.mantlescan.xyz/tx/${TX}`);
  });
});

describe('attestationIpfsUrl', () => {
  it('builds a gateway link', () => {
    expect(attestationIpfsUrl('bafy123')).toBe('https://ipfs.io/ipfs/bafy123');
  });
  it('rejects suspicious CIDs', () => {
    expect(() => attestationIpfsUrl('../etc/passwd')).toThrow(/shape check/);
  });
});

describe('agentShareUrl', () => {
  it('serializes bigint agent ids', () => {
    expect(agentShareUrl(42n, 'https://concierge.xyz')).toBe('https://concierge.xyz/agent/42');
  });
  it('strips trailing slash from origin', () => {
    expect(agentShareUrl('99', 'https://concierge.xyz/')).toBe('https://concierge.xyz/agent/99');
  });
});
