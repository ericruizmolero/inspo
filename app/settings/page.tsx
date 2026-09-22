import { redirect } from "next/navigation";

// Settings has no index of its own: it opens on the first section
export default function SettingsIndex() {
  redirect("/settings/account");
}
