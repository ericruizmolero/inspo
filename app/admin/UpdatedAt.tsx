"use client";
// Hora de la última carga del panel. Se pinta solo en el cliente para que la
// hora salga en la zona horaria de quien mira (el servidor está en Dublín).
import { useEffect, useState } from "react";

export default function UpdatedAt({ iso }: { iso: string }) {
  const [time, setTime] = useState("");
  useEffect(() => {
    setTime(new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));
  }, [iso]);
  return (
    <span className="ad-head__meta">
      {time ? `Actualizado a las ${time}` : "Actualizando…"} · se refresca solo cada minuto
    </span>
  );
}
