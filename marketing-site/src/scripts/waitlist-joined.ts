// What the home shows once an email is on the waitlist. The form that sent it fires "waitlist:joined" (plantilla.html)
// with the address; every form on the page turns into its confirmation. In the one that sent it, the key shrinks to the
// confirmation's box, which crosses the field uncovering the words behind it, and its tick sets off the confetti.
import { confetti } from "./confetti";

const OUT = "cubic-bezier(0.23, 1, 0.32, 1)", IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";   // the design system's --ease-out and --ease-in-out
const SHRINK = 180, CROSS = 420, TICK = 160;

const centre = (e: Element) => {
  const r = e.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** Plays the change on a form already in its confirmed state, and resolves when the tick starts to draw */
async function keyToTick(form: HTMLElement): Promise<void> {
  const part = (s: string) => form.querySelector<HTMLElement>(s)!;
  const key = part(".invite-row .btn"), box = part(".joined-row i");
  const from = centre(key), to = centre(box), size = box.offsetWidth;
  const atKey = `translate(${from.x - to.x}px, ${from.y - to.y}px)`;
  key.animate(
    { clipPath: ["inset(0 round 9px)", `inset(${(key.offsetHeight - size) / 2}px ${(key.offsetWidth - size) / 2}px round 7px)`] },
    { duration: SHRINK, easing: OUT, fill: "forwards" },
  );
  const crossing = { duration: CROSS, delay: SHRINK, easing: IN_OUT, fill: "backwards" } as const;
  box.animate({ opacity: [0, 1] }, { duration: SHRINK, easing: OUT });
  part(".joined-row b").animate({ clipPath: ["inset(-4px 0 -4px 100%)", "inset(-4px 0 -4px 0)"] }, crossing);
  part(".joined-sub").animate({ opacity: [0, 1], transform: ["translateY(4px)", "none"] }, { duration: 240, delay: SHRINK + CROSS * 0.6, easing: OUT, fill: "backwards" });
  box.animate({ clipPath: ["inset(0 100% 0 0)", "inset(0)"] }, { duration: TICK, delay: SHRINK + CROSS, easing: OUT, fill: "backwards", pseudoElement: "::after" });
  await box.animate({ transform: [atKey, "none"] }, crossing).finished;
}

addEventListener("waitlist:joined", async (e) => {
  const sender = e.target as HTMLElement, email = (e as CustomEvent<string>).detail;
  document.querySelectorAll<HTMLElement>("form.invite").forEach((form) => {
    form.querySelector(".joined-mail")!.textContent = email;
    form.classList.add("is-joined");
  });
  sender.querySelector<HTMLElement>(".joined")!.focus({ preventScroll: true });   // the key that had the focus is gone; this also reads the confirmation out
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  await keyToTick(sender);
  const { x, y } = centre(sender.querySelector(".joined-row i")!);
  confetti(x, y, document.querySelector(".h1-m path")?.getAttribute("d"));
});
