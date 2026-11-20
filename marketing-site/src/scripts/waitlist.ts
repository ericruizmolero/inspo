// The waitlist home (WaitlistPage.astro): the menu key, the video's sound, the email form and Tino, who watches the
// video with his back to us and turns to face whoever is writing their email.
import { WAITLIST_URL } from "../i18n";
import { signupOpen } from "./signup-mode";

const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// ── the blur under the nav only shows once the page has moved ──
const onScroll = () => document.documentElement.classList.toggle("scrolled", scrollY > 4);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ── the menu: the key grows into the panel ──
{
  const menu = byId("menu"), panel = byId("menu-panel"), body = byId("menu-body");
  const button = menu.querySelector("button")!, label = button.querySelector("span")!;
  let open = false;
  const size = () => {
    const w = Math.min(520, innerWidth - 24);
    panel.style.setProperty("--pw", w + "px");
    body.style.width = w - 3 + "px";
    panel.style.setProperty("--ph", 46 + body.scrollHeight + "px");
    const r = menu.getBoundingClientRect(), mid = r.left + r.width / 2;
    panel.style.setProperty("--dx", (innerWidth <= 760 ? 0 : Math.max(12 + w / 2 - mid, Math.min(innerWidth - 12 - w / 2 - mid, 0))) + "px");
  };
  const set = (on: boolean) => {
    if (on === open) return;
    open = on;
    if (on) size();
    panel.classList.toggle("open", on);
    body.inert = !on;
    button.setAttribute("aria-expanded", String(on));
    label.textContent = (on ? button.dataset.close : button.dataset.open) ?? "";
  };
  button.addEventListener("click", () => set(!open));
  body.addEventListener("click", (e) => { if ((e.target as Element).closest("a")) set(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && open) { set(false); button.focus(); } });
  addEventListener("pointerdown", (e) => { if (open && !menu.contains(e.target as Node)) set(false); });
  addEventListener("resize", () => { if (open) size(); });
}

// "Join the waitlist" in the menu goes to the form, which is already on screen. With signup open it is "Start free",
// a plain link to the sign-in
document.querySelectorAll<HTMLAnchorElement>('a[href="#mail"]').forEach((a) => a.addEventListener("click", (e) => {
  if (signupOpen()) return;
  e.preventDefault();
  byId("mail").focus();
}));

// ── Tino: the landing's plush (the app's engine), napping in the hero's corner ──
// Asleep until something happens: hover wakes him (a hop, flying pixels and a line), a click makes him jump,
// writing your email turns him to you, and while the video plays he turns his back to watch it.
type Face = "asleep" | "curious" | "following" | "watching" | "skeptic" | "admirer";
interface Plush { set(pose: string): void; show(screen: string): void; look(yaw: number, pitch: number): void; track(on: boolean): void; jump(n: number): void; kick(n: number): void; stroke(x: number, y: number): void; pet(kind: string): void }
interface Engine { create(canvas: HTMLCanvasElement, opts: object): Plush }
const engine = () => (window as Window & { Peluche?: Engine }).Peluche;   // set by the inline module in WaitlistPage.astro
// Each face as the app names it (moods.ts): the engine's pose and what shows inside the visor
const FACES: Record<Face, [string, string?]> = { asleep: ["dormida"], curious: ["curiosa", "barrido"], following: ["siguiendo", "mirada"], watching: ["reposo", "barrido"], skeptic: ["esceptica"], admirer: ["admirada"] };
const BACK = 270, FRONT = 90;   // yaw: 270 is his back to us, facing the video; 90 faces us
const PIXELS = ["#E8892B", "#F6A848", "#F3E2A6", "#B1B9F8", "#F3F2EE"];

const tino = (() => {
  const corner = byId("corner"), box = byId("tino"), zzz = byId("zzz"), say = byId("say"), fx = byId("fx");
  const woken: string[] = JSON.parse(corner.dataset.woken ?? "[]"), poked: string[] = JSON.parse(corner.dataset.poked ?? "[]");
  let plush: Plush | null = null, face: Face | "" = "", over = false, playing = false, reactUntil = 0, settle = 0, hush = 0, napT = 0, wokenN = 0, pokedN = 0;
  const wear = (f: Face) => {
    if (!plush || f === face) return;
    face = f;
    const [pose, screen] = FACES[f];
    if (screen) plush.show(screen);
    plush.set(pose);
    zzz.classList.toggle("on", f === "asleep" && !still);
  };
  const talk = (line: string) => {
    say.textContent = line;
    say.classList.add("on");
    clearTimeout(hush);
    hush = window.setTimeout(() => say.classList.remove("on"), 3200);
  };
  const burst = () => {   // pixels fly out of his head and fall
    if (still) return;
    const f = fx.getBoundingClientRect(), t = box.getBoundingClientRect(), x = t.left + t.width / 2 - f.left, y = t.top + t.height * 0.35 - f.top, r = t.width * 0.45;
    for (let i = 0; i < 22; i++) {
      const dot = document.createElement("i"), a = Math.PI * (1.08 + 0.84 * Math.random()), d = r * (0.7 + Math.random() * 0.9), size = 6 + (Math.random() * 3 | 0) * 4;
      dot.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${PIXELS[i % PIXELS.length]}`;
      fx.appendChild(dot);
      dot.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px)`, opacity: 1, offset: 0.65 }, { transform: `translate(${Math.cos(a) * d * 1.1}px,${Math.sin(a) * d + 46}px)`, opacity: 0 }], { duration: 900 + Math.random() * 500, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }).onfinish = () => dot.remove();
    }
  };
  const writing = () => !!document.activeElement?.closest("#invite");
  const sleep = () => { if (!plush) return; plush.track(false); plush.look(FRONT, 4); wear("asleep"); };
  const watch = () => { if (!plush) return; plush.track(false); plush.look(BACK, 8); wear("watching"); say.classList.remove("on"); };
  const face2you = (f: Face = "following") => { if (!plush) return; plush.track(true); plush.look(FRONT, -4); wear(f); };
  const wake = (line?: string) => {
    if (!plush) return;
    const was = face;
    face2you("curious");
    if (was === "asleep" && !still) { plush.jump(46); plush.kick(40); burst(); }
    if (line) talk(line);
    clearTimeout(settle);
    settle = window.setTimeout(() => { if (face === "curious") wear("following"); }, 900);
  };
  // what he does when nothing is asking for him: watch the video if it plays, look at you if you write, sleep otherwise
  const rest = () => {
    if (!plush || over || performance.now() < reactUntil) return;
    if (playing) watch(); else if (writing()) face2you(); else sleep();
  };
  const gl = (() => { try { const g = document.createElement("canvas").getContext("webgl2"); g?.getExtension("WEBGL_lose_context")?.loseContext(); return !!g; } catch { return false; } })();
  const start = () => {
    const peluche = engine();
    if (plush || !peluche) return;
    plush = peluche.create(box.querySelector("canvas")!, { base: "/assets/mascota/tino-app/", frame: "center", look: [FRONT, 4] });
    plush.pet("corazones");   // stroking his fur brings out hearts
    sleep();
    box.classList.add("on");
  };
  if (gl) { start(); addEventListener("tino-engine", start, { once: true }); }

  box.addEventListener("pointerenter", (e) => {
    if (!plush || e.pointerType === "touch") return;
    over = true;
    clearTimeout(napT);
    if (face === "asleep") wake(woken[wokenN++ % woken.length]);
  });
  box.addEventListener("pointermove", (e) => plush?.stroke(e.clientX, e.clientY));
  box.addEventListener("pointerleave", () => { over = false; clearTimeout(napT); napT = window.setTimeout(rest, 1500); });
  box.addEventListener("click", () => {
    if (!plush) return;
    if (face === "asleep") { wake(woken[wokenN++ % woken.length]); return; }
    if (!still) { plush.jump(64); plush.kick(60); burst(); }
    talk(poked[pokedN++ % poked.length]);
    clearTimeout(napT);
    napT = window.setTimeout(rest, 4000);   // a tap on a phone has no leave: he naps again on his own
  });

  return {
    focus: (inside: boolean) => { if (performance.now() < reactUntil) return; if (inside) { if (face !== "following") wake(); } else { clearTimeout(napT); napT = window.setTimeout(rest, 1200); } },
    film: (on: boolean) => { playing = on; if (!over) rest(); },
    react: (f: Face) => {
      if (!plush) return;
      face2you(f);
      reactUntil = performance.now() + 2600;
      clearTimeout(settle);
      settle = window.setTimeout(rest, 2650);
    },
  };
})();

// ── the video: waits on its poster; the key plays it with sound, and at the end it goes back to the poster ──
{
  const film = byId<HTMLVideoElement>("film"), play = byId<HTMLButtonElement>("play"), screen = film.parentElement!;
  play.addEventListener("click", () => {
    screen.classList.add("playing");
    film.controls = true;
    film.play().catch(() => {});
    film.focus();
  });
  film.addEventListener("play", () => tino.film(true));
  film.addEventListener("pause", () => tino.film(false));
  film.addEventListener("ended", () => { film.controls = false; screen.classList.remove("playing"); film.load(); play.focus(); });
}

// ── the email: checked here; the key sinks with its segment bar while it sends to the app's /api/waitlist ──
{
  const form = byId<HTMLFormElement>("invite"), text = form.dataset;
  const mail = byId<HTMLInputElement>("mail"), note = byId("note");
  const box = form.querySelector<HTMLInputElement>('input[type="checkbox"]')!, honeypot = form.querySelector<HTMLInputElement>(".hp")!;
  const button = form.querySelector<HTMLButtonElement>(".btn")!;
  form.addEventListener("focusin", () => tino.focus(true));
  form.addEventListener("focusout", (e) => { if (!form.contains(e.relatedTarget as Node)) tino.focus(false); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())) { note.textContent = text.bad ?? ""; tino.react("skeptic"); mail.focus(); return; }
    if (!box.checked) { note.textContent = text.consent ?? ""; box.focus(); return; }
    button.classList.add("is-loading");
    button.disabled = true;
    note.textContent = "";
    const end = (good: boolean) => {
      button.classList.remove("is-loading");
      button.disabled = false;
      note.textContent = (good ? text.ok : text.fail) ?? "";
      if (good) { mail.value = ""; box.checked = false; }
      tino.react(good ? "admirer" : "skeptic");
    };
    fetch(WAITLIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: mail.value.trim(), consent: true, locale: text.locale, website: honeypot.value }),
    }).then((r) => end(r.ok), () => end(false));
  });
}
