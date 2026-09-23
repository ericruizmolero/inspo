// English: the source language. Text is written here first and translated from here.
// Each file in lib/i18n/es/ has the same keys and is typed against its match,
// so a missing key does not compile.
//
// ui.ts is the interface text. The others hold the text of things that have
// their own key: the plans, the directory, the taxonomy, the emails and the
// labels for the codes the database stores.
import { ui } from "./ui";
import { labels } from "./labels";
import { taxonomy } from "./taxonomy";
import { plans } from "./plans";
import { directory } from "./directory";
import { mail } from "./mail";
import { errors } from "./errors";

const en = {
  ...ui,
  labels,
  taxonomy,
  mail,
  errors,
  plans: { ...ui.plans, items: plans },
  directory: { ...ui.directory, ...directory },
};

export type Dict = typeof en;
export default en;
