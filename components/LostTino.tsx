"use client";
// Tino on a dead end: sad where something broke, curious in the zero of a 404. The 3D plush follows the theme
import Tino from "./Tino";
import { useDark } from "./HomeTino";

export default function LostTino({ broke, className }: { broke: boolean; className?: string }) {
  const dark = useDark();
  return <Tino className={className} state={broke ? "error" : "curiosa"} dark={dark} look={[110, 0]} petting={!broke} />;
}
