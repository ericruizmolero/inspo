import { getSession } from "@/lib/workspace";
import GuestStart from "@/components/GuestStart";

// The library's server actions run here: an add tags its item after answering (app/actions/library.ts)
export const maxDuration = 300;

// With a session the library is the layout; this page only adds the guest start
export default async function Home() {
  if (!(await getSession())) return <GuestStart />;
  return null;
}
