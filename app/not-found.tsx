import Link from "next/link";
import { getT } from "@/lib/i18n";
import { buttonVariants } from "@/components/ui/button";
import Lost from "@/components/Lost";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <Lost digits title={t.common.notFoundTitle} body={t.common.notFoundBody}>
      <Link className={buttonVariants({ variant: "primary" })} href="/">{t.common.backToLibrary}</Link>
    </Lost>
  );
}
