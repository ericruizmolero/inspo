// Skeleton for a section (Settings, Activity): the title and three cards, while it loads
export default function Loading() {
  return (
    <div className="page__body" aria-busy>
      <span className="sk" style={{ width: 220, height: 32 }} />
      <span className="sk" style={{ width: 320, height: 16 }} />
      <span className="sk" style={{ height: 120, borderRadius: "var(--radius-xl)" }} />
      <span className="sk" style={{ height: 96, borderRadius: "var(--radius-xl)" }} />
      <span className="sk" style={{ height: 96, borderRadius: "var(--radius-xl)" }} />
    </div>
  );
}
