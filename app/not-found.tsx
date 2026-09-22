import Link from "next/link";
import { getT } from "@/lib/i18n";
import { buttonVariants } from "@/components/ui/button";
import Logo from "@/components/Logo";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main className="lost">
      <Logo size={56} />
      <h1 className="display lost__title">{t.common.notFoundTitle}</h1>
      <p className="lost__body">{t.common.notFoundBody}</p>
      <Link className={buttonVariants({ variant: "primary" })} href="/">{t.common.backToLibrary}</Link>
    </main>
  );
}
