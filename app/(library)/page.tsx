import { getSession } from "@/lib/workspace";
import GuestStart from "@/components/GuestStart";
import { getSignupMode } from "@/lib/access";
import { getLocale } from "@/lib/i18n";
import { exampleCriterioMd } from "@/lib/example-md";

// The library's server actions run here: an add tags its item after answering (app/actions/library.ts)
export const maxDuration = 300;

// With a session the library is the layout; this page only adds the guest start
export default async function Home() {
  if (await getSession()) return null;
  const [mode, locale] = await Promise.all([getSignupMode(), getLocale()]);
  return <GuestStart inviteOnly={mode === "invite"} example={exampleCriterioMd(locale)} />;
}
