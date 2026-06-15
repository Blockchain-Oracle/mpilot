'use client';

import { useEffect, useMemo, useState } from 'react';
import { GOAL_EXAMPLES, type GoalChip, parseGoal } from '../_parseGoal';
import type { OnboardingData, StatePatcher } from '../_types';
import { StepShell } from './StepShell';

interface EditableChipProps {
  readonly chip: GoalChip;
  readonly override?: string;
  readonly onCommit: (next: string) => void;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: inline-styled chip
function EditableChip({ chip, override, onCommit }: EditableChipProps) {
  const initial = override ?? chip.value;
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(initial);
  useEffect(() => {
    setV(initial);
  }, [initial]);

  const shown = override ?? chip.value;
  if (editing) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 6px 3px 10px',
          borderRadius: 999,
          border: '1px solid var(--primary)',
          background: 'var(--card)',
          boxShadow: '0 0 0 3px var(--primary-soft)',
        }}
      >
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--ink-3)' }}>
          {chip.key}
        </span>
        <input
          // biome-ignore lint/a11y/noAutofocus: focus moves to the chip input on user-driven click — accessible
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onCommit(v);
              setEditing(false);
            }
            if (e.key === 'Escape') {
              setEditing(false);
            }
          }}
          onBlur={() => {
            onCommit(v);
            setEditing(false);
          }}
          aria-label={`${chip.key} override`}
          style={{
            width: Math.max(40, v.length * 8 + 14),
            font: 'inherit',
            fontFamily: 'var(--mono)',
            fontSize: '0.78rem',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--ink)',
          }}
        />
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="badge"
      style={{
        cursor: 'text',
        gap: 7,
        background: 'var(--primary-soft)',
        borderColor: 'var(--primary-line)',
        color: 'var(--primary)',
      }}
    >
      <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>{chip.key}</span>
      <span style={{ fontWeight: 600 }}>{shown}</span>
    </button>
  );
}

interface GoalInputProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly overrides: Readonly<Record<string, string>>;
  readonly setOverride: (key: string, value: string) => void;
  readonly debounced: string;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: inline-styled goal input
function GoalInput({ value, onChange, overrides, setOverride, debounced }: GoalInputProps) {
  const chips = useMemo(() => parseGoal(debounced), [debounced]);
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Describe the outcome you want and the limits you won't cross…"
        aria-label="Goal"
        style={{
          width: '100%',
          resize: 'vertical',
          padding: '14px 16px',
          fontFamily: 'var(--sans)',
          fontSize: '1.02rem',
          lineHeight: 1.5,
          color: 'var(--ink)',
          background: 'var(--card)',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--r-lg)',
          outline: 'none',
          boxShadow: 'var(--sh-1)',
        }}
      />
      <div style={{ minHeight: 30, marginTop: 12 }}>
        {chips.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
            <span className="ds-eyebrow" style={{ marginRight: 2 }}>
              Parsed
            </span>
            {chips.map((c) => (
              <EditableChip
                key={c.key}
                chip={c}
                override={overrides[c.key]}
                onCommit={(next) => setOverride(c.key, next)}
              />
            ))}
          </div>
        ) : (
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.74rem', color: 'var(--ink-3)' }}>
            Your agent reads parameters as you type — tap one to edit.
          </span>
        )}
      </div>
      <div style={{ marginTop: 18 }}>
        <div className="ds-eyebrow" style={{ marginBottom: 8 }}>
          Try an example
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {GOAL_EXAMPLES.map((ex) => {
            const active = value === ex;
            return (
              <button
                key={ex}
                type="button"
                onClick={() => onChange(ex)}
                aria-pressed={active}
                style={{
                  flexShrink: 0,
                  maxWidth: 260,
                  textAlign: 'left',
                  padding: '10px 13px',
                  cursor: 'pointer',
                  background: active ? 'var(--primary-soft)' : 'var(--paper-2)',
                  border: `1px solid ${active ? 'var(--primary-line)' : 'var(--line)'}`,
                  borderRadius: 'var(--r-md)',
                  fontFamily: 'var(--sans)',
                  fontSize: '0.82rem',
                  color: 'var(--ink-2)',
                  lineHeight: 1.4,
                }}
              >
                {ex}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface StepGoalProps {
  readonly data: OnboardingData;
  readonly set: StatePatcher;
  readonly onBack: () => void;
  readonly onNext: () => void;
}

export function StepGoal({ data, set, onBack, onNext }: StepGoalProps) {
  const [debounced, setDebounced] = useState(data.goal);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(data.goal), 280);
    return () => clearTimeout(id);
  }, [data.goal]);
  return (
    <StepShell
      wide
      eyebrow="Your goal"
      title="What should your agent do?"
      lede="Plain English. No strategy builder — describe the outcome and the guardrails."
      onBack={onBack}
      onNext={onNext}
      nextDisabled={!data.goal.trim()}
      nextLabel="Bring your LLM"
    >
      <GoalInput
        value={data.goal}
        onChange={(v) => set({ goal: v })}
        overrides={data.overrides}
        setOverride={(k, v) => set((prev) => ({ overrides: { ...prev.overrides, [k]: v } }))}
        debounced={debounced}
      />
    </StepShell>
  );
}
