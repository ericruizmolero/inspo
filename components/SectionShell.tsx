"use client";
// Frame for the areas outside the library (Settings, Activity): a shadcn Sidebar with the sections,
// and a header with the trigger and the breadcrumb. The server layout passes labels and icons.
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { useT } from "./I18nProvider";
import Logo from "./Logo";
import { sectionIcon } from "./section-icons";
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

// Inside the provider, so the label can follow the sidebar's state
function Trigger() {
  const { t } = useT();
  const { open, isMobile } = useSidebar();
  return <SidebarTrigger aria-label={isMobile ? t.app.showSidebar : open ? t.app.hideSidebar : t.app.showSidebar} />;
}

export default function SectionShell({ title, base, groups, wide = false, defaultOpen = true, children }: {
  title: string; base: string; groups: ShellGroup[]; wide?: boolean; defaultOpen?: boolean; children: ReactNode;
}) {
  return (
    <SidebarProvider className="shell" defaultOpen={defaultOpen}>
      <Nav title={title} base={base} groups={groups} />
      <SidebarInset className="content">
        <header className="topbar">
          <span className="topbar__trigger"><Trigger /></span>
          <Logo size={24} className="settings__logo" />
          <Crumbs title={title} base={base} groups={groups} />
        </header>
        <div className={`page settings${wide ? " settings--wide" : ""}`}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
