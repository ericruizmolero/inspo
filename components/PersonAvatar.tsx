"use client";
// The system's Avatar for one person or place by name: the photo when there is one, else the initial in the
// name's tone (toneFor). A client component so server components can render it (toneFor runs on the client).
import { Avatar, toneFor } from "@/components/criterio";

export default function PersonAvatar({ name, image, size = 28, square, system }: {
  name: string; image?: string | null; size?: number; square?: boolean;
  /** not a person (the system's own calls): the chrome tone */
  system?: boolean;
}) {
  return <Avatar initials={name.slice(0, 1).toUpperCase()} name={name} tone={system ? "chrome" : toneFor(name)} src={image} size={size} square={square} />;
}
