"use client";
// Frame for the areas outside the library (Settings, Activity, /library): a docked shadcn Sidebar with the sections,
// always open on desktop (no trigger, no ⌘B: Eric, 07-10, a toggle there "makes no sense"), a sheet on a phone opened
// from the top bar. The server layout passes labels and icons.
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { useT } from "./I18nProvider";
import Logo from "./Logo";
import { sectionIcon } from "./section-icons";
import SoundControl from "./SoundControl";
import ZoomPill from "./ZoomPill";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";

export interface ShellItem { slug: string; label: string; icon: string }
export interface ShellGroup { label?: string; items: ShellItem[] }

function Nav({ title, base, groups }: { title: string; base: string; groups: ShellGroup[] }) {
  const { t } = useT();
  const active = useSelectedLayoutSegment();
  const { isMobile, setOpenMobile } = useSidebar();
  const close = () => { if (isMobile) setOpenMobile(false); };
  return (
    <Sidebar mobileTitle={title}>
      <SidebarHeader className="app-sidebar__header">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="nav-item" render={<Link href="/" />}>
              <span className="nav-item__icon">{sectionIcon("back")}</span>
              <span>{t.common.backToLibrary}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={title}>
          {groups.map((g, i) => (
            <SidebarGroup key={g.label ?? i}>
              {g.label && <SidebarGroupLabel className="section-nav__label">{g.label}</SidebarGroupLabel>}
              <SidebarMenu>
                {g.items.map((it) => (
                  <SidebarMenuItem key={it.slug}>
                    <SidebarMenuButton isActive={active === it.slug} className="nav-item" render={<Link href={`${base}/${it.slug}`} onClick={close} />}>
                      <span className="nav-item__icon">{sectionIcon(it.icon)}</span>
                      <span>{it.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}

function Crumbs({ title, base, groups }: { title: string; base: string; groups: ShellGroup[] }) {
  const { t } = useT();
  const active = useSelectedLayoutSegment();
  const current = groups.flatMap((g) => g.items).find((it) => it.slug === active);
  return (
    <Breadcrumb aria-label={t.settings.breadcrumb}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href={base} />}>{title}</BreadcrumbLink>
        </BreadcrumbItem>
        {current && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{current.label}</BreadcrumbPage></BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// Only a phone sees it (globals.css hides it on desktop), so it only ever opens the sheet
function Trigger() {
  const { t } = useT();
  return <SidebarTrigger variant="quiet" size="s" aria-label={t.app.showSidebar} />;
}

export default function SectionShell({ title, base, groups, wide = false, crumbs = true, children }: {
  title: string; base: string; groups: ShellGroup[]; wide?: boolean;
  /** false where the trail would only repeat the page's h1 (Settings): then the bar is a phone's only */
  crumbs?: boolean; children: ReactNode;
}) {
  return (
    // Controlled and never changed: the docked column cannot collapse, there is nothing to bring it back
    <SidebarProvider className="shell shell--docked" open onOpenChange={() => {}}>
      <Nav title={title} base={base} groups={groups} />
      <SidebarInset className="content">
        <header className={`topbar${crumbs ? "" : " topbar--phone"}`}>
          <span className="topbar__trigger"><Trigger /></span>
          <Logo size={24} className="settings__logo" />
          {crumbs && <Crumbs title={title} base={base} groups={groups} />}
        </header>
        {/* data-feedback-entry: no "Give feedback" row at the foot of this column (Eric, 07-10); feedback is reached
            from ⌘K, and the floating dock stays hidden until there are unsent notes, as on every page with a sidebar */}
        <div className={`page settings${wide ? " settings--wide" : ""}`} data-feedback-entry="">{children}</div>
        {/* The music, in the corner it has across the app: the window's bottom-left */}
        <div className="shell-corner"><ZoomPill className="board-zoom" zoom={null}><SoundControl /></ZoomPill></div>
      </SidebarInset>
    </SidebarProvider>
  );
}
