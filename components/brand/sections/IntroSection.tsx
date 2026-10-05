"use client";
// The brand in a statement, set huge, and what it is in up to three paragraphs beside it. Until it is written the
// project's paragraph (the system's summary) speaks for it.
import { useT } from "../../I18nProvider";
import { useBrand } from "../context";
import { AddButton, ItemTools, useSection } from "../BrandPresentation";
import { Editable } from "../edit/Editable";

export default function IntroSection() {
  const { t } = useT();
  const { summary, mode, name } = useBrand();
  const [intro, set] = useSection("intro");
  const paragraphs = intro.paragraphs.length || mode === "edit" ? intro.paragraphs : summary ? [summary] : [];
  return (
    <div className="bi">
      <Editable as="p" className="bi-head" value={intro.headline} onCommit={(headline) => set({ headline })} placeholder={t.brand.intro.headline} fallback={paragraphs.length ? "" : name} maxLength={200} />
      <div className="bi-body">
        {paragraphs.map((p, i) => (
          <div key={i} className="bi-p">
            <Editable as="p" value={p} onCommit={(v) => set({ paragraphs: v ? intro.paragraphs.map((x, j) => (j === i ? v : x)) : intro.paragraphs.filter((_, j) => j !== i) })} placeholder={t.brand.intro.paragraph} multiline />
            <ItemTools list={intro.paragraphs} index={i} onChange={(paragraphs) => set({ paragraphs })} />
          </div>
        ))}
        {mode === "edit" && !intro.paragraphs.length && summary && <p className="bi-ghost">{summary}</p>}
        {intro.paragraphs.length < 3 && <AddButton label={t.brand.intro.addParagraph} onClick={() => set({ paragraphs: [...intro.paragraphs, intro.paragraphs.length ? "" : summary || ""].filter((x, i, all) => x || i === all.length - 1) })} />}
      </div>
    </div>
  );
}
