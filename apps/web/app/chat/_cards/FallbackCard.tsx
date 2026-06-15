'use client';

export function FallbackCard({ output, label }: { output: unknown; label: string }) {
  let body: string;
  try {
    body = JSON.stringify(output, null, 2);
  } catch {
    body = String(output);
  }
  return (
    <div className="gcard">
      <div className="gcard-head">
        <span className="ds-eyebrow">{label}</span>
      </div>
      <pre className="raw-pre" style={{ marginTop: 0 }}>
        {body}
      </pre>
    </div>
  );
}
