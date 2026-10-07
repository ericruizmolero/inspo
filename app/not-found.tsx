import { getT } from "@/lib/i18n";
import { Button } from "@/components/criterio";
import Lost from "@/components/Lost";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <Lost digits title={t.common.notFoundTitle} body={t.common.notFoundBody}>
      <Button variant="primary" href="/">{t.common.backToLibrary}</Button>
    </Lost>
  );
}
