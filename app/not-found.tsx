import Link from "next/link";
import { getT } from "@/lib/i18n";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="page">
      <h1 className="display page__title">{t.common.notFoundTitle}</h1>
      <p>{t.common.notFoundBody}</p>
      <p><Link className="btn btn--primary" href="/">{t.common.backToLibrary}</Link></p>
    </div>
  );
}
