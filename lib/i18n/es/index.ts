import type { Dict } from "../en";
import { ui } from "./ui";
import { labels } from "./labels";
import { taxonomy } from "./taxonomy";
import { plans } from "./plans";
import { recursos } from "./recursos";
import { mail } from "./mail";
import { errors } from "./errors";

const es: Dict = {
  ...ui,
  labels,
  taxonomy,
  mail,
  errors,
  plans: { ...ui.plans, items: plans },
  recursos: { ...ui.recursos, ...recursos },
};

export default es;
