"use client";

// For server pages (/settings, /admin…): just mounts the presence heartbeat.
import { useActivity } from "./useActivity";

export default function ActivityPing({ area, organizationId }: { area: string; organizationId?: string | null }) {
  useActivity(area, organizationId);
  return null;
}
