import TinoMark from "@/components/TinoMark";

/** The product mark: Tino flat, the same drawing as the favicon, in the text colour of where it sits. It stands in
 *  for the name everywhere in the UI; the name lives in the label. */
export default function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return <TinoMark size={size} className={`logo ${className}`} />;
}
