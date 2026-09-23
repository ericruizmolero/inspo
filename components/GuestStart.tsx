"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EmptyStart from "./EmptyStart";
import DirectoryModal from "./DirectoryModal";
import { useT } from "./I18nProvider";
import { buttonVariants } from "@/components/ui/button";
import Logo from "@/components/Logo";

/**
 * Signed-out home page: the same start canvas a new user sees, without the sidebar.
 * Pasting a URL goes to /login carrying the URL; back from the link, the site saves itself (?add=).
 */
export default function GuestStart() {
  const router = useRouter();
  const { t } = useT();
  const [showDirectory, setShowDirectory] = useState(false);

  return (
    <div className="guest">
      <header className="guest__bar">
        <span className="guest__brand">
          <Logo />
          <span>savvia.studio</span>
        </span>
        <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>{t.common.signIn}</Link>
      </header>

      <EmptyStart
        onAddUrl={async (web) => { router.push(`/login?next=${encodeURIComponent(`/?add=${encodeURIComponent(web)}`)}`); }}
        onDirectory={() => setShowDirectory(true)}
      />

      {showDirectory && <DirectoryModal guest onClose={() => setShowDirectory(false)} />}
    </div>
  );
}
