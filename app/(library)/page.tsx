import { getSession } from "@/lib/workspace";
import GuestStart from "@/components/GuestStart";

// With a session the library is the layout; this page only adds the guest start
export default async function Home() {
  if (!(await getSession())) return <GuestStart />;
  return null;
}
