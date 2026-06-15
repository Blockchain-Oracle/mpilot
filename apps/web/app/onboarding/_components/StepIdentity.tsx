'use client';

import { mantleScanTxUrl } from '@concierge-mantle/sdk';
import { useState } from 'react';
import { createPublicClient, http } from 'viem';
import { mintConciergeIdentity } from '../../_lib/conciergeMint';
import { Check, LockboxGlyph } from '../../_lib/icons';
import { sanitizeErrorMessage } from '../../_lib/sanitizeError';
import { useChainGate } from '../../_lib/useChainGate';
import { mantleSepolia } from '../../_lib/wagmi';
import type { StatePatcher } from '../_types';
import { useConciergeAccount } from './ConciergeAccountContext';
import { PhaseRunner } from './PhaseRunner';
import { StepShell } from './StepShell';

const PHASES = ['Minting ERC-8004 identity', 'Registering on reputation registry'] as const;

interface StepIdentityProps {
  readonly onBack: () => void;
  readonly onNext: () => void;
  readonly set: StatePatcher;
}

type Phase = 'idle' | 'running' | 'done' | 'error';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: NFT preview + real mint flow with inline styles — fine
export function StepIdentity({ onBack, onNext, set }: StepIdentityProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agentId, setLocalAgentId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const { account } = useConciergeAccount();

  const handleMint = async () => {
    setErrorMsg(null);
    setPhase('running');
    try {
      if (!account) {
        throw new Error('Smart account not deployed. Go back to the previous step.');
      }
      // The kernel client is itself a viem WalletClient — pass it directly so
      // the registerAgent tx is routed through Pimlico (gas sponsored).
      const publicClient = createPublicClient({
        chain: mantleSepolia,
        transport: http(
          process.env.NEXT_PUBLIC_MANTLE_SEPOLIA_RPC ?? mantleSepolia.rpcUrls.default.http[0],
        ),
      });
      const result = await mintConciergeIdentity({
        // biome-ignore lint/suspicious/noExplicitAny: kernel client implements the viem WalletClient surface registerAgent needs
        walletClient: account.kernelClient as any,
        publicClient,
        chain: 'mantle-sepolia',
      });
      setLocalAgentId(result.agentId);
      setTxHash(result.txHash);
      set({ agentId: result.agentId });
      setPhase('done');
    } catch (err) {
      setErrorMsg(sanitizeErrorMessage(err));
      setPhase('error');
    }
  };

  return (
    <StepShell
      eyebrow="ERC-8004 identity"
      title="Mint your agent's identity"
      lede="This NFT is your agent's permanent identity. Every action accumulates reputation against it — forever, on-chain."
      onBack={onBack}
      onNext={phase === 'done' ? onNext : undefined}
    >
      <div style={{ display: 'grid', placeItems: 'center', marginBottom: 18 }}>
        <div
          className="grid-bg"
          style={{
            position: 'relative',
            width: 160,
            height: 160,
            borderRadius: 18,
            overflow: 'hidden',
            background:
              'linear-gradient(135deg, oklch(0.42 0.20 268), oklch(0.52 0.20 268) 50%, oklch(0.46 0.18 320))',
            display: 'grid',
            placeItems: 'center',
            filter: phase === 'done' ? 'none' : 'grayscale(0.4)',
            opacity: phase === 'running' ? 0.7 : 1,
            transition: 'all 0.4s',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(to right, oklch(1 0 0 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div
            style={{
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'oklch(1 0 0 / 0.14)',
              border: '1px solid oklch(1 0 0 / 0.25)',
              color: '#fff',
            }}
          >
            <LockboxGlyph size={34} />
          </div>
          {phase === 'done' && agentId !== null && (
            <span
              style={{
                position: 'absolute',
                bottom: 12,
                fontFamily: 'var(--mono)',
                fontSize: '0.72rem',
                color: '#fff',
              }}
            >
              Agent #{agentId.toString()}
            </span>
          )}
        </div>
      </div>
      {(phase === 'idle' || phase === 'error') && (
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={handleMint}
          disabled={!account}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {phase === 'error' ? 'Retry mint' : 'Mint identity NFT'}
        </button>
      )}
      {phase === 'error' && errorMsg && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: '10px 13px',
            background: 'var(--danger-soft)',
            border: '1px solid var(--danger-line)',
            borderRadius: 'var(--r-md)',
            fontFamily: 'var(--mono)',
            fontSize: '0.78rem',
            color: 'var(--danger)',
          }}
        >
          {errorMsg}
        </div>
      )}
      {phase === 'running' && <PhaseRunner phases={[...PHASES]} running done={undefined} />}
      {phase === 'done' && agentId !== null && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            alignItems: 'center',
            fontFamily: 'var(--mono)',
            fontSize: '0.82rem',
            color: 'var(--signal)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={16} aria-hidden /> Agent #{agentId.toString()} minted · reputation starts
            at 0
          </div>
          {txHash && (
            <a
              href={mantleScanTxUrl(txHash, mantleSepolia.id)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.72rem', color: 'var(--primary)' }}
            >
              View tx on MantleScan ↗
            </a>
          )}
        </div>
      )}
    </StepShell>
  );
}
