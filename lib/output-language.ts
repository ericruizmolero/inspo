// The language the model writes in for a workspace (organization.output_language).
// It is not the interface language (lib/i18n/locale.ts): that one belongs to each person,
// this one to the team, so everyone on it reads the same decisions, reasons and summaries.
// Every prompt is written in English and ends with languageRule(), which lib/prompts.ts adds to every task that
// writes for people; writtenIn() is how the evals check it was followed.
export const OUTPUT_LANGUAGES = ["en", "es", "fr", "de", "it", "pt-PT", "pt-BR", "nl", "ca", "ja", "zh", "ko"] as const;
export type OutputLanguage = (typeof OUTPUT_LANGUAGES)[number];
export const DEFAULT_OUTPUT_LANGUAGE: OutputLanguage = "en";

export const isOutputLanguage = (v: unknown): v is OutputLanguage =>
  typeof v === "string" && (OUTPUT_LANGUAGES as readonly string[]).includes(v);
export const toOutputLanguage = (v: unknown): OutputLanguage => (isOutputLanguage(v) ? v : DEFAULT_OUTPUT_LANGUAGE);

/** The name the model reads. Precise about the variety: "Spanish" alone drifts to Latin American. */
const LANGUAGE_NAME: Record<OutputLanguage, string> = {
  en: "English",
  es: "Castilian Spanish (Spanish from Spain), tú form",
  fr: "French (France)",
  de: "German, du form",
  it: "Italian",
  "pt-PT": "European Portuguese (Portugal)",
  "pt-BR": "Brazilian Portuguese",
  nl: "Dutch",
  ca: "Catalan",
  ja: "Japanese",
  zh: "Simplified Chinese",
  ko: "Korean",
};

export const languageName = (lang: OutputLanguage) => LANGUAGE_NAME[lang];

/** For the picker: each language in its own name, like LangSwitch */
export const OWN_NAME: Record<OutputLanguage, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  "pt-PT": "Português (Portugal)",
  "pt-BR": "Português (Brasil)",
  nl: "Nederlands",
  ca: "Català",
  ja: "日本語",
  zh: "简体中文",
  ko: "한국어",
};

/**
 * The closing block of every prompt whose output a person reads.
 * `fields` names what is written in that language (e.g. `every "reason"`); the rest of the JSON stays as specified.
 */
export function languageRule(lang: OutputLanguage, fields: string): string {
  const name = LANGUAGE_NAME[lang];
  return `LANGUAGE
Write ${fields} in ${name}, natural and direct, whatever language the input is in.
- Every ordinary word is in ${name}, including words you take from the input ("cream", "full-bleed", "paper white"): translate them. Never mix two languages in one sentence.
- Only these keep their original form: font names, brand and product names, hex and CSS values, ids, enum values, and quotes of the team's or a site's copy, marked as quotes.
- Text you carry over from earlier proposals is translated too, with nothing else changed.`;
}

/** Words common in each Latin-script language and rare in the others; Portuguese counts once for both varieties */
const COMMON: Record<string, string[]> = {
  en: ["the", "and", "of", "to", "with", "is", "are", "for", "that", "this", "on", "its", "not", "from", "every"],
  es: ["el", "los", "las", "y", "con", "para", "por", "una", "es", "se", "sin", "como", "más", "sus", "pero"],
  fr: ["le", "les", "des", "et", "avec", "pour", "une", "est", "dans", "qui", "sur", "pas", "du", "aux", "ce"],
  de: ["der", "die", "das", "und", "mit", "für", "ist", "ein", "eine", "nicht", "den", "dem", "auf", "zu", "im"],
  it: ["il", "gli", "della", "e", "con", "per", "che", "una", "è", "non", "sono", "nel", "alla", "delle", "ogni"],
  pt: ["o", "os", "da", "do", "das", "dos", "e", "com", "para", "uma", "não", "em", "no", "na", "é"],
  nl: ["het", "een", "en", "van", "met", "voor", "is", "niet", "op", "zijn", "dat", "naar", "ook", "bij", "elke"],
  ca: ["els", "les", "i", "amb", "per", "una", "és", "dels", "al", "la", "cada", "sense", "però", "seu", "aquest"],
};

/**
 * Whether `text` reads as written in `lang`, for the evals: by script for Japanese, Chinese and Korean, by the
 * Latin-script language whose common words it uses most for the rest. null: too short to tell.
 */
export function writtenIn(text: string, lang: OutputLanguage): boolean | null {
  const count = (re: RegExp) => text.match(re)?.length ?? 0;
  const letters = count(/\p{L}/gu);
  if (letters < 20) return null;
  const kana = count(/[\u3040-\u30ff]/g), han = count(/[\u4e00-\u9fff]/g), hangul = count(/[\uac00-\ud7af]/g);
  if (hangul / letters > 0.3) return lang === "ko";
  // Japanese writes kanji too: any kana makes it Japanese
  if ((kana + han) / letters > 0.3) return lang === (kana ? "ja" : "zh");
  if (lang === "ja" || lang === "zh" || lang === "ko") return false;
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  const score = Object.fromEntries(Object.entries(COMMON).map(([l, list]) => [l, words.filter((w) => list.includes(w)).length]));
  const [best, hits] = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  if (hits < 3) return null;
  return best === (lang.startsWith("pt") ? "pt" : lang);
}
