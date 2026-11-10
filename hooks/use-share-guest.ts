"use client";
// Who is looking at a share link (lib/share-guests.ts). An invited person is their own address: the server says who.
// Anyone else gets a random name on first visit ("Nutria ámbar"), and their avatar is its initial in its tone. The
// browser keeps it with a random secret, the same on every link, so the person stays the same person. Their key is the
// secret's hash, worked out here as the server does, to know which comments are theirs.
import { useCallback, useEffect, useState } from "react";

const STORE = "criterio:share-guest";
export interface Guest { key: string; name: string; secret: string }

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

async function keyOf(secret: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)));
  return `anon:${b64url(hash).slice(0, 24)}`;
}

export function useShareGuest(invited: { key: string; name: string } | null, randomName: () => string) {
  const [guest, setGuest] = useState<Guest | null>(invited ? { ...invited, secret: "" } : null);
  useEffect(() => {
    if (invited) return;
    let saved: { secret?: string; name?: string } = {};
    try { saved = JSON.parse(localStorage.getItem(STORE) ?? "{}") ?? {}; } catch { /* a private window: a new guest each visit */ }
    const secret = typeof saved.secret === "string" && /^[\w-]{20,64}$/.test(saved.secret) ? saved.secret : b64url(crypto.getRandomValues(new Uint8Array(24)));
    const name = typeof saved.name === "string" && saved.name.trim() ? saved.name : randomName();
    try { localStorage.setItem(STORE, JSON.stringify({ secret, name })); } catch { /* kept for this visit only */ }
    void keyOf(secret).then((key) => setGuest({ key, name, secret }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once per page: the name is drawn the first time only
  }, []);
  const rename = useCallback((name: string) => {
    setGuest((g) => {
      if (!g) return g;
      if (!invited) { try { localStorage.setItem(STORE, JSON.stringify({ secret: g.secret, name })); } catch { /* this visit only */ } }
      return { ...g, name };
    });
  }, [invited]);
  return { guest, rename };
}

export const randomGuestName = (names: readonly string[], colors: readonly string[], nameOf: (a: string, c: string) => string) => nameOf(pick(names), pick(colors));
