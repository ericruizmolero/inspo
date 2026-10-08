"use client";
// One click between light and dark, on screen without being in the way: the system's IconButton (default, m, its
// label the data-tip balloon) floating in the bottom-right corner on the chrome tokens, and on a phone a row at the
// sidebar's foot. Both
// icons are in the markup and globals.css shows the one for the theme a click leads to (it reads
// <html data-theme>), so nothing waits for the browser to know the theme. Choosing here is choosing by hand:
// "System" stays in Settings (ThemeSwitch).
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { switchTheme } from "@/lib/theme";
import { Icon, IconButton } from "@/components/criterio";
import { useT } from "./I18nProvider";

const flip = () => switchTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");

/** `row`: a line of the sidebar, with its words; otherwise the floating button */
export default function ThemeToggle({ row, onPick }: { row?: boolean; onPick?: () => void }) {
  const { t } = useT();
  const icons = <><Icon name="sun" size={16} className="theme-toggle__sun" /><Icon name="moon" size={16} className="theme-toggle__moon" /></>;
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
  return (
    <IconButton variant="default" size="m" className="theme-toggle theme-float" onClick={flip} label={t.theme.toggle}
      icon={<><Icon name="sun" size={18} className="theme-toggle__sun" /><Icon name="moon" size={18} className="theme-toggle__moon" /></>} />
  );
}
