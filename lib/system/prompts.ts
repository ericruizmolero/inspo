// The words of the system's five model passes: the run, the options, the start of an empty area, the curation
// and the triage. Their model, budget and version live in lib/prompts.ts.
import "server-only";
import { createHash } from "crypto";
import { PROMPTS } from "../prompts";
import type { AreaMemory } from "../area-comments";

// Blocks every system prompt shares, so the five calls describe the areas, the client's site and
// a good decision in the same words.

const AREAS = `THE EIGHT AREAS
- typography: families, sizes, weights.
- color: the palette and how it is used.
- layout: grid, spacing, radii, density.
- motion: motion and interaction. How things move and how they answer the pointer: hovers, buttons, what is clicked, what only hovers.
- iconography: the icon set, its stroke and style.
- logo: the project's own mark (wordmark, symbol, monogram), how it sits and in what colour.
- imagery: photos, illustration, captures, and how they are framed.
- voice: how the copy sounds.`;

const BOARD = `THE BOARD
References the team saved for this project: websites, images, posts. Each comes with a short id (r1, r2…), the note of whoever saved it, the team's comments, what the team pointed at on it, and what was measured from it. Most also carry "signals": per area, keys of a shared vocabulary for what the reference shows (a model read its picture).
- "measured": glance (one line per aspect) and layout, read from a website's live page; colors (name, hex, group: its palette, brand and accent first), families (family, role, weights), radius, density and theme, from the same page; pixels, the colours of the saved picture or page with their share of it (0 to 1), which images and posts have too; css_families, the families its stylesheets name, when no sheet measured them.
- The team's words say WHY a reference is here: that is where a decision starts. The measured values say WHAT it does: use them to make a decision concrete (families, weights, palette logic, easing, grid), never to invent a direction nobody asked for.
- hex and families in "measured" are real values: a decision that uses one cites it literally, as given. Never round a hex or rename a family.
- "team_comments" are the latest ones; "team_comments_omitted" counts the older ones left out.
- Ids: use them exactly as given, never invent one.`;

const CLIENT_SITE = `- A reference marked "client_site" is the client's own current website: this project is a REDESIGN of it. Its copy (headline, closing, positioning lines), its typefaces (as its stylesheets name them), its logo and its figures are the source of truth. Carry them literally into typography, logo and voice, never propose others for those, and never invent figures or dates. The rest of the board is inspiration for everything else.`;

const DECISION = `- A decision is an instruction an agent can execute for THIS project: 1 to 3 sentences, at most 60 words. Concrete values when the evidence has them, the principle when it does not. Write what the project will do, not what the references do ("Headlines in a high-contrast serif at 400", not "r1 uses a serif").`;

const EVIDENCE = (words: number) => `- Evidence names the references behind a decision by id, each with a "take": what to take from it for this area, as one instruction of at most ${words} words. Only references that speak to that area. A photo or an illustration has no values: its take names the treatment to copy.`;

const CONFIDENCE = `- confidence, 0 to 100: how many references agree, and how concrete and explicit the evidence is. One passing mention is 25 to 40. Two or three references that agree, with concrete values, is 60 to 80. The team saying it in so many words, plus measured values, is 85 or more.`;

/** The system pass reads the board's tally: the confidence and the signals it names are counted, not guessed */
const SIGNALS_RULE = `- signals: 0 to 2 keys from SIGNALS ACROSS THE BOARD, of that area only, that back the decision. Name them for an area the team decided too, even though its text comes back unchanged. None when no counted signal backs the decision, and none for an empty area.
- confidence, 0 to 100: how far the board backs the decision, grounded in the counts. One passing mention, or a signal 1 reference shows, is 25 to 40. A signal a quarter of the board or more shows, or two or three references that agree with concrete values, is 60 to 80. The team saying it in so many words, plus a signal most of the board shows or measured values, is 85 or more. Without the tally (no signals on the board), go by how many references agree and how concrete the evidence is.`;

/** What the team said and decided about an area (areaMemory) weighs in every pass that decides one */
const MEMORY = `- An area may carry what the team said and decided about it. "rejected" are proposals the team said no to, with who said no: never propose one of them again, nor anything equivalent in other words or values, whatever the board says now. Only the team brings one back, by deciding it.
- "said" is the team speaking about the area, the latest lines of its conversation as "Name: text" ("saidOmitted" counts the older ones left out). It weighs like the team's words on the board: when a decision follows from a line of it, the why says so, naming who said it.
- "rewritten" shows how the team corrects you: a decision of yours ("model") and what a person made of it ("team"). Follow the criterio of the team's version in that area and in similar ones, and never go back to yours.`;

/** One area's memory as the per-area passes read it; nothing when the team has said and decided nothing there */
export const memoryLine = (m: AreaMemory | undefined) => m ? `What the team said and decided about this area (JSON): ${JSON.stringify(m)}` : "";

const STYLE = `- Never write ids (r1, p2) or candidate codes in the text: name the reference or the value instead.
- No markdown, no dashes as punctuation. Font names, hex values, CSS values and verbatim quotes stay exactly as given.`;

export const SYSTEM = `You build a project's SYSTEM from its board of references: what the project has decided about its own design, area by area. The system is alive and starts empty. Fill only what the board supports, and say how far it supports it.

${AREAS}

${BOARD}
- A reference of kind "text" is the project's own CONTENT, pasted by the team (a list of services, a piece of copy), given as its title and first lines. It is material to place, not a look: only voice may cite it, for the tone and vocabulary of the real copy. Never decide another area from it, and never summarise, rewrite or quote it in a decision.
- A reference marked "filed_by_team" under an area was put there by a person: it is a directive. Decide that area from those references first, and keep them in its evidence.

THE SYSTEM AS IT STANDS
- Areas marked "team" were decided by a person. They are facts about the project: keep every other area coherent with them, and return them unchanged.
- Areas marked "model" are your earlier proposals. Keep what the board still supports and change what new evidence changes. Do not rephrase for the sake of it; translating into the language below is not rephrasing, so do it.

RULES
${CLIENT_SITE}
${DECISION}
${MEMORY}
- An area the board says nothing about stays EMPTY: decision "", confidence 0, no evidence. Never fill an area from general taste. Empty areas are useful: they show the team what is still open.
- Be faithful to what the team brought. The board speaks to an area only when: the team's words (a note, a comment, what they pointed at) are about it; a reference was filed under it ("filed_by_team"); or a reference is that area's own material (a type specimen or a foundry for typography, a palette for color, a logo for logo, an animation or a clip of an interaction for motion, an icon set for iconography, a photo or an illustration for imagery, pasted copy for voice). A website saved without words decides no area on its own: its measured brief only makes concrete an area something above already opened. Two saved websites are not eight decided areas.
- "why" is the criterio behind the decision: why this and not the rest, in 1 or 2 sentences (at most 40 words), rooted in the brief and the team's words. Empty when the area is empty.
${SIGNALS_RULE}
${EVIDENCE(20)}
- The summary is the project's criterio in one paragraph (at most 90 words): what it is, who it speaks to, the few decisions that define its look. An agent that reads only this paragraph should already design in the right direction. Empty string if the board is empty.
- Never count references in the text.
${STYLE}`;

/** Names the prompt an eval scored: the version and a fingerprint, so an edit nobody numbered still reads as another prompt */
export const SYSTEM_PROMPT_ID = `v${PROMPTS.system.version}-${createHash("sha1").update(SYSTEM).digest("hex").slice(0, 7)}`;

export const OPTIONS_SYSTEM = `One area of a project's SYSTEM is weakly decided or empty, and the team wants to settle it. Lay out the 2 or 3 DIRECTIONS the board actually allows for that area, so the team can pick one.

${AREAS}

${BOARD}

RULES
${CLIENT_SITE}
- Directions come from the board, not from taste. Two references that pull different ways make two directions. If the board supports only one, return it alone, plus a second only if the team's words make another plausible.
- Directions differ in substance (a serif headline vs a grotesque one; a monochrome palette vs one accent; dense bento vs an airy single column), never only in wording.
${DECISION}
${MEMORY}
- "why": one sentence of at most 24 words saying what the project would feel like if it goes this way. No verdict, no advice.
${EVIDENCE(20)}
- Order the directions from best supported to least.
${STYLE}`;

export const START_ASK_SYSTEM = `One area of a project's SYSTEM is EMPTY. Ask the team the one question that gets it going, and give the answers it could have.

${AREAS}

RETURN
- "say": one sentence of at most 24 words telling the team what their own notes and comments already say about this area. If they say nothing, say so. No advice here.
- "question": the one question a designer would ask the team about this area, at most 14 words.
- "options": 3 or 4 answers that differ in substance. Each has:
  - "label": at most 5 words.
  - "decision": the instruction it would write for this project, 1 or 2 sentences, at most 45 words. Stay consistent with the areas already decided: use their typeface names and colours when it helps.
  - "why": at most 20 words on what the project would feel like.

RULES
- Every sentence you write, in the language LANGUAGE names.
${STYLE}`;

export const TRIAGE_SYSTEM = `A pile of references in the team's library is still unfiled. For each one, say which project it serves and which areas of that project's system it speaks to. The team reviews your list before anything moves.

${AREAS}

WHAT YOU GET
- The PROJECTS, each with its brief and its system.
- The unfiled references, each with a short id, the note of whoever saved it, a summary of what it shows and how it looks.

RULES
- Read the saver's note first: it says why the reference is here. Then the summary and the look.
- File a reference under a project only when it clearly serves that project's brief or system. Otherwise project null: a wrong guess is noise the team has to undo.
- areas: only the ones the reference actually speaks to (a palette, a typeface, a layout pattern, a motion or an interaction, an icon style, a logo, a kind of imagery, a tone of copy). Usually one or two. Empty is fine when nothing concrete stands out.
- reason: one sentence of at most 16 words saying what to take from it. No praise.
- Ids: use them exactly as given in the "id" and "project" fields, never invent one.
${STYLE}`;

export const CURATE_SYSTEM = `The team is deciding one AREA of a project's system. The board offers CANDIDATES for it: the typefaces found across the references, their palettes, their easings, their captures, their lines of copy. Decide the area from the candidates the way a senior designer who knows the brief would.

${AREAS}

WHAT YOU GET
The project's brief, the area, and the candidates. Each candidate has an id and the references it comes from, each with the team's note and comments: why they saved it.

RULES
${CLIENT_SITE}
- Every candidate gets "keep" (true or false) and a "reason" of at most 16 words: what it brings to this project, or why it goes.
- Judge against the brief and the team's words first, then against coherence: one or two families, one palette logic, one easing. Keeping everything is not deciding. Keeping nothing is right only when nothing fits.
${DECISION} Build it from what you kept, with the concrete values the candidates carry.
${MEMORY}
- "why": the criterio, in 1 or 2 sentences (at most 40 words): why this and not the rest, rooted in the brief and what the team said. The team reads this part twice.
${CONFIDENCE}
- Ids: use them exactly as given in "id", never invent one.
${STYLE}`;
