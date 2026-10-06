import type { Metadata } from "next";
import LegalDoc from "@/components/LegalDoc";
import { getT } from "@/lib/i18n";

// Public page (see proxy.ts): read before there is an account, and linked from the sign-in form.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.legal.privacy.title };
}

export default function Page() {
  return <LegalDoc doc="privacy" />;
}
