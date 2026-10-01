import { redirect } from "next/navigation";
import { getSession } from "@/lib/workspace";

// The library's server actions run here: an add tags its item after answering (app/actions/library.ts)
export const maxDuration = 300;

// A shared link to one inspiration's DESIGN.md. The library (the layout) reads the path and opens it.
export default async function InspoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getSession())) redirect(`/login?next=${encodeURIComponent(`/i/${id}`)}`);
  return null;
}
