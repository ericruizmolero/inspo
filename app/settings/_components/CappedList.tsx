"use client";
// A .list that shows its first `cap` rows and a quiet "See all N" under them. The rows come from the server.
import { Children, useState, type ReactNode } from "react";
import { Button } from "@/components/criterio";
import { useT } from "@/components/I18nProvider";

export default function CappedList({ children, cap = 5 }: { children: ReactNode; cap?: number }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const rows = Children.toArray(children);
  return (
    <>
      <ul className="list">{open ? rows : rows.slice(0, cap)}</ul>
      {rows.length > cap && (
        <Button variant="quiet" size="s" className="list__more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? t.common.seeLess : t.common.seeAll(rows.length)}
        </Button>
      )}
    </>
  );
}
