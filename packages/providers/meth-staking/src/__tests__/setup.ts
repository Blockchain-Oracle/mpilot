import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { type Chain, createPublicClient, defineChain, http, type PublicClient } from 'viem';

export const MANTLE_MAINNET_RPC = process.env['MANTLE_RPC_URL'] ?? 'https://rpc.mantle.xyz';
const ANVIL_BIN = process.env['ANVIL_BIN'] ?? 'anvil';

// Block 96_500_000 ≈ 2026-06-10, chosen to be consistent with ondo-usdy test suite.
export const FORK_BLOCK = 96_500_000;

// The Agni 500 bps mETH/WETH pool holds mETH as protocol-owned liquidity.
// Verified on-chain 2026-06-11: balanceOf returns 531_061_684_362_586_411n.
export const KNOWN_METH_HOLDER = '0x4f9E3683A523b66Da89d82BbA0a9CAA1C3243dF4' as const;

export interface AnvilFork {
  readonly port: number;
  readonly chain: Chain;
  readonly publicClient: PublicClient;
  readonly stop: () => Promise<void>;
}

function getFreePort(): Promise<number> {
  return new Promise((res, rej) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      srv.close(() => res((addr as { port: number }).port));
    });
    srv.on('error', rej);
  });
}

/**
 * Port-race-tolerant wrapper around the underlying spawn. Per
 * `feedback_anvil_port_collision_pattern.md` — `getFreePort()` has a TOCTOU
 * race: another process can grab the port between our `srv.close()` and
 * `anvil --port N` bind. Retry up to 5 times when the failure shape matches
 * "before listening" / "EADDRINUSE" / "address in use" — each retry gets a
 * fresh port. Other failure shapes propagate immediately so genuine bugs
 * surface fast.
 */
export async function startAnvilFork(forkBlock?: number): Promise<AnvilFork> {
  const PORT_RACE_RX = /before listening|EADDRINUSE|address in use|address already in use/i;
  const MAX_ATTEMPTS = 5;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await startAnvilForkOnce(forkBlock);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!PORT_RACE_RX.test(msg) || attempt === MAX_ATTEMPTS) throw err;
      process.stderr.write(
        `[setup] Anvil port race on attempt ${attempt}/${MAX_ATTEMPTS}; retrying with fresh port. (${msg.slice(0, 80)})\n`,
      );
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Anvil retry loop exhausted unexpectedly');
}

async function startAnvilForkOnce(forkBlock?: number): Promise<AnvilFork> {
  const port = await getFreePort();
  const blockArgs = forkBlock !== undefined ? ['--fork-block-number', String(forkBlock)] : [];

  return new Promise((resolve, reject) => {
    const proc = spawn(
      ANVIL_BIN,
      ['--port', String(port), '--fork-url', MANTLE_MAINNET_RPC, ...blockArgs],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let started = false;
    let stopping = false;
    const buf: string[] = [];

    const timer = setTimeout(() => {
      if (!started) {
        proc.kill('SIGTERM');
        reject(
          new Error(
            `Anvil fork startup timed out after 30s. Install Foundry (https://getfoundry.sh) or set ANVIL_BIN.`,
          ),
        );
      }
    }, 30_000);

    const onData = (chunk: Buffer) => {
      buf.push(chunk.toString());
      if (!started && buf.join('').includes('Listening on')) {
        started = true;
        clearTimeout(timer);
        const chain = defineChain({
          id: 5000,
          name: 'Anvil (Mantle fork)',
          nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
          rpcUrls: { default: { http: [`http://127.0.0.1:${port}`] } },
        });
        const transport = http(`http://127.0.0.1:${port}`);
        const publicClient = createPublicClient({ chain, transport });
        const stop = () =>
          new Promise<void>((res) => {
            stopping = true;
            proc.once('exit', () => res());
            proc.kill('SIGTERM');
          });
        resolve({ port, chain, publicClient, stop });
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start Anvil fork: ${err.message}`));
    });
    proc.on('exit', (code) => {
      if (!started) {
        clearTimeout(timer);
        reject(new Error(`Anvil exited with code ${String(code)} before listening`));
      } else if (!stopping) {
        process.stderr.write(`[setup] Anvil fork exited unexpectedly: code=${String(code)}\n`);
      }
    });
  });
}
