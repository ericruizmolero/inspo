"use client";

// "Give feedback" at the foot of the sidebars (library, settings, activity). Where it is
// on the page, the floating dock hides until there are unsent notes (globals.css,
// data-feedback-entry), so the button stops sitting over the grid every day.
// data-feedback-toolbar: Agentation ignores it, so it is not annotated while the mode is on.
import { useT } from "./I18nProvider";
import { sectionIcon } from "./section-icons";
import { enterFeedbackMode } from "./feedback-mode";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export default function FeedbackEntry({ onPick }: { onPick?: () => void }) {
  const { t } = useT();
  return (
    <div data-feedback-entry="" data-feedback-toolbar="true">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            className="nav-item nav-item--quiet"
            title={t.feedback.entryHint}
            onClick={() => { onPick?.(); enterFeedbackMode(); }}
          >
            <span className="nav-item__icon">{sectionIcon("feedback")}</span>
            <span>{t.feedback.open}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
