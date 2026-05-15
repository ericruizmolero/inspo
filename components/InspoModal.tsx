"use client";

import { useEffect, useState } from "react";
import { InspoItem } from "@/types/inspo";
import ProxyFrame from "./ProxyFrame";

interface InspoModalProps {
  item: InspoItem;
  onClose: () => void;
}

export default function InspoModal({ item, onClose }: InspoModalProps) {
  const [proxyFailed, setProxyFailed] = useState(false);

  useEffect(() => {
    // Reset al cambiar de item
    setProxyFailed(false);
  }, [item]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#EDE8DF",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          padding: "0 24px",
          height: "52px",
          borderBottom: "1px solid #D8D0C6",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#8A8580",
            fontSize: "18px",
            lineHeight: 1,
            padding: "4px",
            flexShrink: 0,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#0F1923")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#8A8580")}
        >
          ×
        </button>

        <span
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#0F1923",
            letterSpacing: "-0.01em",
            flexShrink: 0,
          }}
        >
          {item.empresa}
        </span>

        <a
          href={item.web}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: "11px",
            color: "#A09890",
            textDecoration: "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexShrink: 1,
            minWidth: 0,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#0F1923")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#A09890")}
        >
          {item.web}
        </a>

        <div style={{ flex: 1 }} />

        {item.comentarios && (
          <p
            style={{
              fontSize: "11px",
              color: "#8A8580",
              margin: 0,
              maxWidth: "400px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            title={item.comentarios}
          >
            {item.comentarios}
          </p>
        )}

        <span
          style={{
            fontSize: "10px",
            color: "#C8C0B8",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            flexShrink: 0,
            fontFamily: "var(--font-mono)",
          }}
        >
          {item.fecha}
        </span>
      </div>

      {/* Frame */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <ProxyFrame
          url={item.web}
          iframeWidth={1440}
          iframeHeight={900}
          enableNav
          onFail={() => setProxyFailed(true)}
        />

        {/* Overlay si el proxy falla */}
        {proxyFailed && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              background: "#EDE8DF",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                color: "#8A8580",
                letterSpacing: "-0.01em",
              }}
            >
              No se puede previsualizar este sitio
            </span>
            <a
              href={item.web}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "12px",
                color: "#0F1923",
                textDecoration: "none",
                borderBottom: "1px solid #0F1923",
                paddingBottom: "2px",
                letterSpacing: "0.01em",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.5")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
            >
              Abrir en nueva pestaña →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
