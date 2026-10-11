// The search and the menu over a grouped list (resources, skills) narrow it in place. Both live in the address
// (?q= and the menu's own name, ?kind= or ?topic=), so a filtered list can be shared. The rows carry their words,
// already plain, in data-text; the groups their key in data-group.
import { plain } from "../plain";

const tools = document.querySelector<HTMLElement>("[data-tools]");
const search = document.querySelector<HTMLInputElement>("[data-search]");
const menu = document.querySelector<HTMLSelectElement>("[data-menu]");
const none = document.querySelector<HTMLElement>("[data-none]");
const groups = [...document.querySelectorAll<HTMLElement>("[data-group]")];

if (tools && search && menu && none) {
  const params = new URLSearchParams(location.search);
  search.value = params.get("q") ?? "";
  if (groups.some((g) => g.dataset.group === params.get(menu.name))) menu.value = params.get(menu.name)!;
  tools.hidden = false;

  const apply = () => {
    const words = plain(search.value).split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const group of groups) {
      const inMenu = !menu.value || group.dataset.group === menu.value;
      let inGroup = 0;
      for (const row of group.querySelectorAll<HTMLElement>("[data-text]")) {
        const hit = inMenu && words.every((w) => row.dataset.text!.includes(w));
        row.hidden = !hit;
        if (hit) inGroup++;
      }
      group.hidden = inGroup === 0;
      shown += inGroup;
    }
    none.hidden = shown > 0;
    const next = new URLSearchParams();
    if (search.value.trim()) next.set("q", search.value.trim());
    if (menu.value) next.set(menu.name, menu.value);
    history.replaceState(null, "", next.size ? `?${next}` : location.pathname);
  };

  search.addEventListener("input", apply);
  search.addEventListener("keydown", (e) => { if (e.key === "Escape" && search.value) { search.value = ""; apply(); } });
  menu.addEventListener("change", apply);
  apply();
}
