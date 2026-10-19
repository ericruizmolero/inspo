// A capture that read an error page instead of the site: its title or description say so. Pure, so the tagger (when it
// writes the summary) and the file (for summaries stored before) both ask the same question.

const FAILED = [
  /^\s*(?:(?:http\s*)?error\s*[:#]?\s*)?(?:40[134]|50[0-4])\b/i, /\b(?:http\s*)?error\s*[:#]?\s*(?:40[134]|50[0-4])\b/i,
  /\bnot\s+found\b/i, /\bpage\s+(?:can(?:no|')t|could\s?n'?t)\s+be\s+found\b/i, /\bno\s+(?:se\s+)?encuentra\b/i, /\bp[aá]gina\s+no\s+encontrada\b/i,
  /\baccess\s+denied\b/i, /\bforbidden\b/i, /\bacceso\s+denegado\b/i,
  /\bjust\s+a\s+moment\b/i, /\battention\s+required\b/i, /\bchecking\s+your\s+browser\b/i, /\bverify\s+you\s+are\s+(?:a\s+)?human\b/i, /\bare\s+you\s+a\s+robot\b/i,
  /\bservice\s+unavailable\b/i, /\bbad\s+gateway\b/i, /\bsomething\s+went\s+wrong\b/i,
];

/** True when what a page says about itself is an error page's: not a description of the site worth keeping as "what it is" */
export const pageFailed = (...said: (string | undefined | null)[]): boolean => {
  const text = said.filter(Boolean).join(" ").trim();
  return !!text && text.length < 400 && FAILED.some((re) => re.test(text));
};
