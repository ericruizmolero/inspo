"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EmptyStart from "./EmptyStart";
import dynamic from "next/dynamic";
import { useT } from "./I18nProvider";
import { Button } from "@/components/criterio";
import Logo from "@/components/Logo";
import ThemeToggle from "./ThemeToggle";

// Only once someone opens it
const DirectoryModal = dynamic(() => import("./DirectoryModal"), { ssr: false });

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
        <Button size="s" href="/login">{t.common.signIn}</Button>
      </header>

      <EmptyStart
        onAddUrl={async (web) => { router.push(`/login?next=${encodeURIComponent(`/?add=${encodeURIComponent(web)}`)}`); }}
        onDirectory={() => setShowDirectory(true)}
      />

      {showDirectory && <DirectoryModal guest onClose={() => setShowDirectory(false)} />}
      {/* The theme is a preference, so it is here before signing in too (Eric, 07-10) */}
      <ThemeToggle />
    </div>
  );
}
