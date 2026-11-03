// Skeleton for a settings page, built on the real classes so it keeps their spacing: the header, then two sections
// with their hairline, title and rows
const rows = [3, 2];

export default function Loading() {
  return (
    <>
      <header className="settings__heading" aria-busy>
        <div className="settings__titles">
          <span className="sk" style={{ width: 220, height: 32 }} />
          <span className="sk" style={{ width: 320, maxWidth: "100%", height: 16 }} />
        </div>
      </header>
      <div className="page__body" aria-hidden>
        {rows.map((count, s) => (
          <section key={s} className="cr-swin">
            <div className="cr-swin-titles">
              <span className="sk" style={{ width: 140, height: 20 }} />
              <span className="sk" style={{ width: 260, maxWidth: "100%", height: 14 }} />
            </div>
            <div className="cr-swin-body">
              {Array.from({ length: count }, (_, r) => (
                <div key={r} className="cr-fieldrow">
                  <div className="cr-fieldrow-label">
                    <span className="sk" style={{ width: 120, height: 14 }} />
                  </div>
                  <div className="cr-fieldrow-control">
                    <span className="sk" style={{ height: 34, borderRadius: "var(--radius-md)" }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
