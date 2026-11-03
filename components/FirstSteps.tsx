"use client";
// The first steps, from signing up to the first criterio.md (#103): a quiet list beside the plan meter, the step to
// do marked with the ember dot and its line of help under it. Each row goes where its step is done. Never a modal.
import Link from "next/link";
import { useT } from "./I18nProvider";
import { Icon, StatusRing } from "@/components/criterio";
import { REFS_GOAL, STEPS, nextStep, type FirstSteps as Steps } from "@/lib/first-steps-core";
import "./FirstSteps.css";

export default function FirstSteps({ steps, onHide, onConnect }: {
  steps: Steps;
  onHide: () => void;
  /** The last step's other way out: connecting an AI client (ConnectDialog) */
  onConnect: () => void;
}) {
  const { t } = useT();
  const s = t.firstSteps;
  const done = STEPS.filter((x) => x.done(steps)).length;
  return (
    <section className="first-steps" aria-label={s.title}>
      <div className="first-steps__head">
        <span className="first-steps__title">{s.title}</span>
        <span>{s.count(done, STEPS.length)}</span>
        <button type="button" className="first-steps__hide" onClick={onHide}>{s.hide}</button>
      </div>
      <FirstStepsPath steps={steps} onConnect={onConnect} />
    </section>
  );
}

/** The six steps themselves, each row going where its step is done. Tino's balloon has them too, and moves with
 *  `onGo` instead of a link, so it can do a step in place (naming a project on the home) */
export function FirstStepsPath({ steps, onConnect, onGo }: { steps: Steps; onConnect?: () => void; onGo?: (href: string) => void }) {
  const { t } = useT();
  const s = t.firstSteps;
  const now = nextStep(steps);
  return (
    <ol className="first-steps__list">
      {STEPS.map((step) => {
        const isDone = step.done(steps), isNow = step.key === now;
        const label = step.key === "refs" ? s.steps.refs.label(Math.min(steps.refs, REFS_GOAL), REFS_GOAL) : s.steps[step.key].label;
        const row = <>
          <span className="first-steps__mark" aria-hidden>{isDone ? <Icon name="check" size={14} /> : <StatusRing tone={isNow ? "new" : "idle"} />}</span>
          <span className="first-steps__label">{label}{isDone && <span className="cr-visually-hidden">, {s.done}</span>}</span>
        </>;
        return (
          <li key={step.key} className={`first-steps__step${isDone ? " is-done" : ""}${isNow ? " is-now" : ""}`} aria-current={isNow ? "step" : undefined}>
            {onGo
              ? <button type="button" className="first-steps__row" onClick={() => onGo(step.href(steps))}>{row}</button>
              : <Link href={step.href(steps)} className="first-steps__row">{row}</Link>}
            {isNow && <p className="first-steps__hint">{s.steps[step.key].hint}</p>}
            {isNow && step.key === "out" && onConnect && !onGo && <button type="button" className="first-steps__more" onClick={onConnect}>{s.connect}</button>}
          </li>
        );
      })}
    </ol>
  );
}
