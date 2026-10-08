// The sections of Settings, Admin and the design library, one Phosphor glyph each
import {
  AppWindow, ArrowsHorizontal, Asterisk, CaretLeft, ChartBar, Chat, CheckCircle, CircleHalf, Clock, Code, CornersOut, CursorClick,
  File, Fingerprint, Globe, Keyboard, Layout, Lock, Notepad, Path, Pulse, PuzzlePiece, Shapes, SquaresFour, Stack, TextT, ToggleRight, User, Users } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";

const GLYPHS: Record<string, Icon> = {
  back: CaretLeft,
  account: User,
  workspace: AppWindow,
  members: Users,
  plan: ChartBar,
  extension: PuzzlePiece,
  overview: Pulse,
  usage: Clock,
  people: Users,
  feedback: Chat,
  access: Lock,
  principles: Asterisk,
  foundations: SquaresFour,
  components: ToggleRight,
  patterns: Stack,
  keyboard: Keyboard,
  layout: Layout,
  language: Globe,
  page: File,
  check: CheckCircle,
  code: Code,
  decisions: Notepad,
  color: CircleHalf,
  type: TextT,
  spacing: ArrowsHorizontal,
  radius: CornersOut,
  motion: Path,
  icons: Shapes,
  button: CursorClick,
  brand: Fingerprint,
};

/** Every section icon, for the library's Iconos page */
export const SECTION_ICON_NAMES = Object.keys(GLYPHS);

export function sectionIcon(name: string) {
  const Glyph = GLYPHS[name];
  return <Glyph size={16} aria-hidden />;
}
