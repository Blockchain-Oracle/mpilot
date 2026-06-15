export default function OnboardingLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 520, display: 'grid', gap: 12 }}>
        <div className="skeleton-line" style={{ width: '40%', height: 14 }} />
        <div className="skeleton-line" style={{ width: '70%', height: 28 }} />
        <div className="skeleton-line" style={{ width: '90%', height: 14 }} />
        <div className="skeleton-line" style={{ width: '100%', height: 200 }} />
      </div>
    </div>
  );
}
