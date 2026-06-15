'use client';

import { useEffect, useState } from 'react';
import { Check } from '../../_lib/icons';

interface PhaseRunnerProps {
  readonly phases: readonly string[];
  readonly running: boolean;
  readonly done?: () => void;
}

const TICK_MS = 850;

/**
 * Reusable progress runner — animates through `phases` at ~850ms per step.
 * Designer's prototype mocks the underlying ops (deploy / mint); in the
 * production wire-up this hooks into real RPC + IPFS pin events.
 */
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: row-renderer with inline styles — fine
export function PhaseRunner({ phases, running, done }: PhaseRunnerProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!running) {
      setActive(0);
      return;
    }
    setActive(0);
    const id = setInterval(() => setActive((a) => Math.min(a + 1, phases.length)), TICK_MS);
    return () => clearInterval(id);
  }, [running, phases.length]);

  useEffect(() => {
    if (running && active >= phases.length) done?.();
  }, [active, running, phases.length, done]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* biome-ignore lint/complexity/noExcessiveLinesPerFunction: inline-styled row map */}
      {phases.map((p, i) => {
        const st: 'idle' | 'run' | 'done' = !running
          ? 'idle'
          : i < active
            ? 'done'
            : i === active
              ? 'run'
              : 'idle';
        return (
          <div
            key={p}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 'var(--r-md)',
              background: st === 'run' ? 'var(--primary-soft)' : 'var(--paper-2)',
              border: `1px solid ${st === 'run' ? 'var(--primary-line)' : 'var(--line)'}`,
              opacity: st === 'idle' && running ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 22,
                height: 22,
                borderRadius: '50%',
                flexShrink: 0,
                background: st === 'done' ? 'var(--signal)' : 'transparent',
                border: `2px solid ${
                  st === 'done'
                    ? 'var(--signal)'
                    : st === 'run'
                      ? 'var(--primary)'
                      : 'var(--line-2)'
                }`,
                color: '#fff',
              }}
            >
              {st === 'done' && <Check size={12} />}
              {st === 'run' && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--primary)',
                  }}
                />
              )}
            </span>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '0.82rem',
                color:
                  st === 'done' ? 'var(--ink)' : st === 'run' ? 'var(--primary)' : 'var(--ink-2)',
              }}
            >
              {p}
            </span>
            {st === 'run' && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--mono)',
                  fontSize: '0.72rem',
                  color: 'var(--ink-3)',
                }}
              >
                working…
              </span>
            )}
            {st === 'done' && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--mono)',
                  fontSize: '0.72rem',
                  color: 'var(--signal)',
                }}
              >
                done
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
