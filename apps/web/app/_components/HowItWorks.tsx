/**
 * "How it works" — three-step explainer. Maps the agent loop to the
 * user's mental model: tell it (goal) → it works (plan/sim/execute) →
 * see receipts (ERC-8004 attestations).
 */
const STEPS: ReadonlyArray<{ readonly n: string; readonly title: string; readonly body: string }> =
  [
    {
      n: '01',
      title: 'Tell it what you want',
      body: 'Plain English. "Max yield on stablecoins, keep $200 liquid, never drop below 1.8 health factor." Concierge parses it into typed policies.',
    },
    {
      n: '02',
      title: 'It works on its own',
      body: 'Every tick: plan with the LLM, simulate against a forked chain, propose a move, execute via a session key, record the attestation.',
    },
    {
      n: '03',
      title: 'You see receipts, not promises',
      body: 'Every tick lands an ERC-8004 attestation tied to the agent NFT. Anyone can audit the history. Your reputation, your custody.',
    },
  ];

export function HowItWorks() {
  return (
    <section
      id="how"
      style={{
        padding: '72px 28px',
        borderTop: '1px solid var(--line)',
        background: 'var(--paper-2)',
      }}
    >
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
        <span className="ds-eyebrow">How it works</span>
        <h2 className="ds-h-sec" style={{ marginTop: 12, marginBottom: 36 }}>
          The agent loop, made boring on purpose
        </h2>
        <ol
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 18,
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {STEPS.map(({ n, title, body }) => (
            <li key={n} className="card" style={{ padding: 20 }}>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.78rem',
                  color: 'var(--primary)',
                  letterSpacing: '0.06em',
                  marginBottom: 10,
                }}
              >
                {n}
              </div>
              <h3 className="ds-h-card" style={{ marginBottom: 8, fontSize: '1.12rem' }}>
                {title}
              </h3>
              <p style={{ color: 'var(--ink-2)', margin: 0 }}>{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
