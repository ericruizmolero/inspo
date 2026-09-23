"use client";
// Time of the panel's last load. Painted only on the client so the
// time shows in the viewer's time zone (the server is in Dublin).
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
    <span className="settings__meta">
      {time ? t.admin.updatedAt(time) : t.admin.updating}{t.admin.refreshNote}
    </span>
  );
}
