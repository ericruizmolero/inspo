"use client";
// One click between light and dark, on screen without being in the way: a small glass button floating in the
// bottom-right corner, in the zoom pill's glass, and on a phone a row at the sidebar's foot. Both
// icons are in the markup and globals.css shows the one for the theme a click leads to (it reads
// <html data-theme>), so nothing waits for the browser to know the theme. Choosing here is choosing by hand:
// "System" stays in Settings (ThemeSwitch).
import { Moon, Sun } from "lucide-react";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { switchTheme } from "@/lib/theme";
import { useT } from "./I18nProvider";

const flip = () => switchTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");

/** `row`: a line of the sidebar, with its words; otherwise the floating button */
export default function ThemeToggle({ row, onPick }: { row?: boolean; onPick?: () => void }) {
  const { t } = useT();
  const icons = <><Sun className="theme-toggle__sun" size={16} strokeWidth={1.5} aria-hidden /><Moon className="theme-toggle__moon" size={16} strokeWidth={1.5} aria-hidden /></>;
  if (row) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className="theme-toggle nav-item nav-item--quiet" onClick={() => { flip(); onPick?.(); }}>
            <span className="nav-item__icon">{icons}</span>
            <span>{t.theme.toggle}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }
  return <button type="button" className="theme-toggle theme-float" onClick={flip} aria-label={t.theme.toggle} title={t.theme.toggle}>{icons}</button>;
}
