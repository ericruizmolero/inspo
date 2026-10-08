// The eight areas of the system, one Phosphor glyph each. Wherever an area is named (a node, a tile,
// the "to the system" menu) its icon goes first.
import { Drop, Image, Layout, Path, Quotes, TrademarkRegistered, Shapes, TextAa } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { SystemArea } from "@/types/system";

const GLYPHS: Record<SystemArea, Icon> = {
  typography: TextAa,
  color: Drop,
  layout: Layout,
  motion: Path,
  iconography: Shapes,
  logo: TrademarkRegistered,
  imagery: Image,
  voice: Quotes,
};

/** `size` in px: 16 in menus, 12 next to the small mono labels of nodes and tiles */
export function areaIcon(area: SystemArea, size = 16) {
  const Glyph = GLYPHS[area];
  return <Glyph className="area-icon" size={size} aria-hidden />;
}
