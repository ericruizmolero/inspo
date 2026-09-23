import type { Metadata } from "next";
import Logo from "@/components/Logo";
import { getT } from "@/lib/i18n";

// Public page (see proxy.ts): the Chrome Web Store asks for a privacy policy URL, and anyone
// weighing the extension should be able to read it without an account.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.ext.privacy.title };
}

export default async function ExtensionPrivacyPage() {
  const { t } = await getT();
  return (
    <div className="page">
      <header className="page__head">
        <Logo size={36} />
        <div className="page__heading">
          <h1 className="display page__title">{t.ext.privacy.title}</h1>
          <p className="page__lead">{t.ext.privacy.lead}</p>
        </div>
      </header>
      <div className="legal">
        {t.ext.privacy.sections.map(([heading, body]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
