"use client";
// Tino on a dead end: sad where something broke, curious in the zero of a 404. The 3D plush follows the theme
import Tino from "./Tino";
import { useDark } from "./HomeTino";
import { moodProps } from "./tino/moods";

export default function LostTino({ broke, className }: { broke: boolean; className?: string }) {
  const dark = useDark();
  return <Tino className={className} dark={dark} petting={!broke} {...moodProps(broke ? "sad" : "skeptic")} />;
}
