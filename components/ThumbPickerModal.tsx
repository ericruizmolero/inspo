"use client";

import { useEffect, useState, useRef } from "react";
import { Icons } from "./Sidebar";
import { useT } from "./I18nProvider";

interface ThumbPickerModalProps {
  // Returns error string on failure, null on success
  onSelect: (blobUrl: string) => Promise<string | null>;
  onCancel: () => void;
}

export default function ThumbPickerModal({ onSelect, onCancel }: ThumbPickerModalProps) {
  const { t } = useT();
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/thumbnail/list")
      .then((r) => r.json())
      .then((d) => { setUrls(d.urls ?? []); setLoading(false); });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !selecting) onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, selecting]);

  const handleClick = async (url: string) => {
    if (selecting) return;
    setSelecting(url);
    setError(null);
    const err = await onSelect(url);
    if (err) { setSelecting(null); setError(err); }
  };

  return (
    <div
      ref={overlayRef}
      className="modal-backdrop"
      style={{ zIndex: 1000 }}
      onClick={(e) => { if (e.target === overlayRef.current && !selecting) onCancel(); }}
    >
      <div className="modal modal--lg">
        <div className="modal__header">
          <span className="display modal__title">{t.thumbs.title}</span>
          {error && <span className="modal__error">{error}</span>}
          {selecting && <span className="modal__hint">{t.thumbs.saving}</span>}
          <span className="modal__hint">{urls.length}</span>
          <button className="btn-icon" onClick={() => { if (!selecting) onCancel(); }} disabled={!!selecting} aria-label={t.common.close}>
            {Icons.x}
          </button>
        </div>

        <div className="modal__body" style={{ padding: 14 }}>
          {loading ? (
            <div className="empty" style={{ minHeight: 200 }}>{t.common.loading}</div>
          ) : urls.length === 0 ? (
            <div className="empty" style={{ minHeight: 200 }}>{t.thumbs.empty}</div>
          ) : (
            <div className="picker-grid">
              {urls.map((url) => {
                const isSelecting = selecting === url;
                return (
                  <button
                    key={url}
                    className={`picker-item${selecting && !isSelecting ? " is-dimmed" : ""}`}
                    onClick={() => handleClick(url)}
                    disabled={!!selecting}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/thumbnail/img?url=${encodeURIComponent(url)}`} alt="" loading="lazy" />
                    {isSelecting && (
                      <div className="picker-item__busy"><span className="spinner" style={{ width: 16, height: 16 }} /></div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
