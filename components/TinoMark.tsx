import { useId } from "react";

/** Tino flat, the brand mark: the favicon's drawing (app/icon.svg) inline, in currentColor, so it takes the app's
 *  theme instead of the system's. The visor is cut out of the body (a mask), so whatever is behind shows through. */
export default function TinoMark({ size = 32, className = "", label = "criterio.design" }: { size?: number; className?: string; label?: string }) {
  const cut = `tino-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="23.5 37.5 63 63" width={size} height={size} role="img" aria-label={label} className={`tino-mark ${className}`}>
      <mask id={cut} maskUnits="userSpaceOnUse" x="23.5" y="37.5" width="63" height="63">
        <g fill="#fff" stroke="#fff" strokeWidth={2.4} strokeLinejoin="round">
          <path transform="translate(43 65.7) rotate(-12.1)" d="M2.9 0C3.5 -0.6 3.4 -1.2 3.7 -1.8C3.9 -2.4 4.1 -3.1 4.3 -3.7C4.4 -4.3 4.6 -4.9 4.7 -5.5C4.8 -6.1 4.9 -6.7 4.9 -7.3C5 -7.9 5 -8.6 5 -9.2C5 -9.8 5 -10.4 4.9 -11C4.8 -11.6 4.8 -12.2 4.6 -12.8C4.5 -13.4 4.4 -14.1 4.2 -14.7C4 -15.3 3.8 -15.9 3.6 -16.5C3.3 -17.1 3.1 -17.7 2.8 -18.3C2.5 -18.9 2.2 -19.6 1.7 -20.2C1.3 -20.8 0.6 -22 0 -22C-0.6 -22 -1.3 -20.8 -1.7 -20.2C-2.2 -19.6 -2.5 -18.9 -2.8 -18.3C-3.1 -17.7 -3.3 -17.1 -3.6 -16.5C-3.8 -15.9 -4 -15.3 -4.2 -14.7C-4.4 -14.1 -4.5 -13.4 -4.6 -12.8C-4.8 -12.2 -4.8 -11.6 -4.9 -11C-5 -10.4 -5 -9.8 -5 -9.2C-5 -8.6 -5 -7.9 -4.9 -7.3C-4.9 -6.7 -4.8 -6.1 -4.7 -5.5C-4.6 -4.9 -4.4 -4.3 -4.3 -3.7C-4.1 -3.1 -3.9 -2.4 -3.7 -1.8C-3.4 -1.2 -3.5 -0.6 -2.9 0C-2.3 0.6 -1 1.5 0 1.5C1 1.5 2.3 0.6 2.9 0z" />
          <path transform="translate(57 64) rotate(-0.1)" d="M2.9 0C3.5 -0.6 3.4 -1.2 3.7 -1.8C3.9 -2.4 4.1 -3.1 4.3 -3.7C4.4 -4.3 4.6 -4.9 4.7 -5.5C4.8 -6.1 4.9 -6.7 4.9 -7.3C5 -7.9 5 -8.6 5 -9.2C5 -9.8 5 -10.4 4.9 -11C4.8 -11.6 4.8 -12.2 4.6 -12.8C4.5 -13.4 4.4 -14.1 4.2 -14.7C4 -15.3 3.8 -15.9 3.6 -16.5C3.3 -17.1 3.1 -17.7 2.8 -18.3C2.5 -18.9 2.2 -19.6 1.7 -20.2C1.3 -20.8 0.6 -22 0 -22C-0.6 -22 -1.3 -20.8 -1.7 -20.2C-2.2 -19.6 -2.5 -18.9 -2.8 -18.3C-3.1 -17.7 -3.3 -17.1 -3.6 -16.5C-3.8 -15.9 -4 -15.3 -4.2 -14.7C-4.4 -14.1 -4.5 -13.4 -4.6 -12.8C-4.8 -12.2 -4.8 -11.6 -4.9 -11C-5 -10.4 -5 -9.8 -5 -9.2C-5 -8.6 -5 -7.9 -4.9 -7.3C-4.9 -6.7 -4.8 -6.1 -4.7 -5.5C-4.6 -4.9 -4.4 -4.3 -4.3 -3.7C-4.1 -3.1 -3.9 -2.4 -3.7 -1.8C-3.4 -1.2 -3.5 -0.6 -2.9 0C-2.3 0.6 -1 1.5 0 1.5C1 1.5 2.3 0.6 2.9 0z" />
        </g>
        <path fill="#fff" d="M55 58C69.9 58 80.7 64.2 84 79C86.5 90.4 75 96 64 96H46C35 96 23.5 90.4 26 79C29.3 64.2 40.1 58 55 58z" />
        <path stroke="#000" strokeWidth={6.2} strokeLinecap="round" d="M60 75h17" />
      </mask>
      <rect x="23.5" y="37.5" width="63" height="63" fill="currentColor" mask={`url(#${cut})`} />
    </svg>
  );
}
