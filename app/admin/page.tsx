import { redirect } from "next/navigation";

// /admin opens on the overview; the period (?dias=) comes along. Emails that grant access link here.
export default async function AdminIndex({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { dias } = await searchParams;
  redirect(`/admin/overview${dias ? `?dias=${encodeURIComponent(dias)}` : ""}`);
}
