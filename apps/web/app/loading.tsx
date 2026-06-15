/**
 * Global loading fallback. Next.js App Router shows this while a server
 * component is suspended. Designed to never shift layout — the skeleton box
 * matches the landing hero's footprint so first paint is stable.
 */
export default function Loading() {
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
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          display: 'grid',
          gap: 16,
        }}
      >
        <div className="skeleton-line" style={{ width: '60%', height: 32 }} />
        <div className="skeleton-line" style={{ width: '100%', height: 16 }} />
        <div className="skeleton-line" style={{ width: '80%', height: 16 }} />
      </div>
      <span style={{ position: 'absolute', left: -9999, top: -9999 }}>Loading…</span>
    </div>
  );
}
