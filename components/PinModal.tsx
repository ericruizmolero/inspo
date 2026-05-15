"use client";

import { useState, useEffect, useRef } from "react";

interface PinModalProps {
  onConfirm: (pin: string) => void;
  onCancel: () => void;
}

export default function PinModal({ onConfirm, onCancel }: PinModalProps) {
  const [pin, setPin] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim()) onConfirm(pin.trim());
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(15,25,35,0.3)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#F5F1EB",
          borderRadius: "6px",
          padding: "24px",
          width: "280px",
          boxShadow: "0 8px 40px rgba(15,25,35,0.15)",
          display: "flex", flexDirection: "column", gap: "16px",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#0F1923", letterSpacing: "-0.01em" }}>
            Introduce el PIN
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#A09890" }}>
            Necesario para subir thumbnails
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            ref={inputRef}
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="····"
            style={{
              background: "#EDE8DF",
              border: "1px solid #D8D0C6",
              borderRadius: "3px",
              fontSize: "18px",
              letterSpacing: "0.2em",
              color: "#0F1923",
              padding: "10px 12px",
              outline: "none",
              fontFamily: "inherit",
              width: "100%",
              boxSizing: "border-box",
              textAlign: "center",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#A09890")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#D8D0C6")}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button" onClick={onCancel}
              style={{ flex: 1, background: "none", border: "1px solid #D8D0C6", borderRadius: "3px", padding: "8px", fontSize: "12px", color: "#8A8580", cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={!pin.trim()}
              style={{ flex: 1, background: "#0F1923", border: "none", borderRadius: "3px", padding: "8px", fontSize: "12px", color: "#EDE8DF", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
