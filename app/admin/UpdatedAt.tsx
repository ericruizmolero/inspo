"use client";
// Hora de la última carga del panel. Se pinta solo en el cliente para que la
// hora salga en la zona horaria de quien mira (el servidor está en Dublín).
import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { fmtTime } from "@/lib/i18n/format";

export default function UpdatedAt({ iso }: { iso: string }) {
  const { locale, t } = useT();
  const [time, setTime] = useState("");
  useEffect(() => {
    setTime(fmtTime(iso, locale));
  }, [iso, locale]);
  return (
    <span className="ad-head__meta">
      {time ? t.admin.updatedAt(time) : t.admin.updating}{t.admin.refreshNote}
    </span>
  );
}
