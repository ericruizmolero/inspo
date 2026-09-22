"use client";

// Para páginas de servidor (/equipo, /planes, /admin…): monta el latido de presencia sin más.
import { useActivity } from "./useActivity";

export default function ActivityPing({ area, organizationId }: { area: string; organizationId?: string | null }) {
  useActivity(area, organizationId);
  return null;
}
