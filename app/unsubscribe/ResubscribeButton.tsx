"use client";
// "Turn it back on": the same signed link, the other way. One click, then the page says it is on again.
import { useState, useTransition } from "react";
import { resubscribe } from "@/app/actions/notifications";
import { Button } from "@/components/criterio";
import { useT } from "@/components/I18nProvider";

export default function ResubscribeButton({ userId, kind, sig }: { userId: string; kind: "digest" | "replies"; sig: string }) {
  const { t } = useT();
  const [on, setOn] = useState(false);
  const [pending, start] = useTransition();
  if (on) return <p className="page__lead t-body">{t.unsubscribe.on[kind]}</p>;
  return <Button onClick={() => start(async () => { if (await resubscribe(userId, kind, sig)) setOn(true); })} disabled={pending}>{t.unsubscribe.again}</Button>;
}
