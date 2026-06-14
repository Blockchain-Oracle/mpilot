'use client';

import { BrandMark } from '@concierge-mantle/ui';
import { useRef } from 'react';
import type { KeyStatus, LlmProviderId, OnboardingData, StatePatcher } from '../_types';
import { StepShell } from './StepShell';

interface ProviderEntry {
  readonly id: LlmProviderId;
  readonly name: string;
  readonly placeholder: string;
}

const PROVIDERS: readonly ProviderEntry[] = [
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-…' },
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-…' },
  { id: 'google', name: 'Google', placeholder: 'AIza…' },
  { id: 'xai', name: 'xAI', placeholder: 'xai-…' },
];

const VERIFY_LATENCY_MS = 850;

function statusLabel(s: KeyStatus): string {
  if (s === 'verified') return '✓ verified';
  if (s === 'verifying') return 'verifying…';
  if (s === 'invalid') return '✗ invalid key';
  return 'optional';
}

function statusColor(s: KeyStatus): string {
  if (s === 'verified') return 'var(--signal)';
  if (s === 'verifying') return 'var(--primary)';
  if (s === 'invalid') return 'var(--danger)';
  return 'var(--ink-3)';
}

interface StepLlmProps {
  readonly data: OnboardingData;
  readonly set: StatePatcher;
  readonly onBack: () => void;
  readonly onNext: () => void;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: BYOK provider list with inline styles — fine
export function StepLlm({ data, set, onBack, onNext }: StepLlmProps) {
  // One timer per provider; using a Map keeps types tight.
  const timers = useRef<Partial<Record<LlmProviderId, ReturnType<typeof setTimeout>>>>({});

  const change = (id: LlmProviderId, v: string) => {
    set((prev) => ({
      keys: { ...prev.keys, [id]: v },
      keyStatus: { ...prev.keyStatus, [id]: v ? 'verifying' : 'empty' },
    }));
    const existing = timers.current[id];
    if (existing) clearTimeout(existing);
    if (!v) return;
    timers.current[id] = setTimeout(() => {
      set((prev) => ({
        keyStatus: { ...prev.keyStatus, [id]: v.length >= 12 ? 'verified' : 'invalid' },
      }));
    }, VERIFY_LATENCY_MS);
  };

  const anyVerified = (Object.values(data.keyStatus) as KeyStatus[]).some((s) => s === 'verified');

  return (
    <StepShell
      wide
      eyebrow="Bring your LLM"
      title="Add a model provider key"
      lede="You pay the model provider directly — we never hold your key, and you stay the principal. One key is enough to start."
      onBack={onBack}
      onNext={onNext}
      nextDisabled={!anyVerified}
      nextLabel="Set policy"
    >
      <div className="card" style={{ padding: 6 }}>
        {PROVIDERS.map((p, i) => {
          const st = data.keyStatus[p.id];
          const v = data.keys[p.id];
          const isSet = v && st === 'verified';
          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '13px 12px',
                borderTop: i ? '1px solid var(--line)' : 'none',
                flexWrap: 'wrap',
              }}
            >
              <BrandMark name={p.id} size={30} radius={9} />
              <div style={{ minWidth: 120 }}>
                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: '0.92rem',
                    fontWeight: 500,
                    color: 'var(--ink)',
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '0.72rem',
                    color: statusColor(st),
                  }}
                >
                  {statusLabel(st)}
                </div>
              </div>
              {isSet ? (
                <div
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.8rem',
                      color: 'var(--ink-2)',
                    }}
                  >
                    {v.slice(0, 7) + '•'.repeat(8)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => change(p.id, '')}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={v}
                  placeholder={p.placeholder}
                  onChange={(e) => change(p.id, e.target.value)}
                  aria-label={`${p.name} API key`}
                  style={{
                    marginLeft: 'auto',
                    flex: 1,
                    minWidth: 150,
                    maxWidth: 260,
                    padding: '8px 11px',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.82rem',
                    color: 'var(--ink)',
                    background: 'var(--card)',
                    border: `1px solid ${st === 'invalid' ? 'var(--danger-line)' : 'var(--line-2)'}`,
                    borderRadius: 'var(--r-md)',
                    outline: 'none',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: '11px 13px',
          marginTop: 14,
          background: anyVerified ? 'var(--signal-soft)' : 'var(--paper-2)',
          border: `1px solid ${anyVerified ? 'var(--signal-line)' : 'var(--line)'}`,
          borderRadius: 'var(--r-md)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.78rem',
            color: anyVerified ? 'var(--signal)' : 'var(--ink-3)',
          }}
        >
          {anyVerified
            ? '✓ Key verified — you can continue.'
            : 'Paste at least one provider key to continue. ~$0.10 per tick on Sonnet 4.5.'}
        </span>
      </div>
    </StepShell>
  );
}
