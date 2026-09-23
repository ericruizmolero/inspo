import { Inter } from "next/font/google";

// One family everywhere. Variable weight plus the optical size axis,
// so small UI text opens up and large titles tighten on their own.
export const inter = Inter({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-inter",
  display: "swap",
});
