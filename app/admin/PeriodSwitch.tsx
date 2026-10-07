"use client";
// The Activity period (7, 30, 90 days): the system's SegmentedControl in its paper tone. Each choice is a
// navigation (?dias=), so the server loads that period.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { SegmentedControl } from "@/components/criterio";

export default function PeriodSwitch({ section, days, options, labels, label }: {
  section: string; days: number; options: number[]; labels: string[]; label: string;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <SegmentedControl
      tone="paper"
      choice
      className="theme-seg ad-period"
      label={label}
      active={options.indexOf(days)}
      onChange={(i) => { if (options[i] !== days) start(() => router.push(`/admin/${section}?dias=${options[i]}`)); }}
      items={labels.map((l) => ({ label: l }))}
    />
  );
}
