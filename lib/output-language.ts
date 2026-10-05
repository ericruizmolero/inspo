// The language the model writes in for a workspace (organization.output_language).
// It is not the interface language (lib/i18n/locale.ts): that one belongs to each person,
// this one to the team, so everyone on it reads the same decisions, reasons and summaries.
// Every prompt is written in English and ends with languageRule().
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
  return `LANGUAGE
Write ${fields} in ${LANGUAGE_NAME[lang]}, natural and direct, whatever language the input is in. This includes text you carry over from earlier proposals: if it is in another language, translate it and change nothing else. Font names, hex and CSS values, ids, enum values and verbatim quotes stay exactly as given.`;
}
