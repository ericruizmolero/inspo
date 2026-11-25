// The email registry and layout (lib/mail-templates.ts, lib/mail-layout.ts) and what sendMail hands Resend: the
// template's alias, its variables checked and escaped, and List-Unsubscribe on an email with a stop link. Resend is
// a fetch stub; nothing leaves the machine.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { TEMPLATES, TEMPLATE_KEYS, aliasOf, letter, mail, resendVariables, textPart, throughTwins, variablesOf, type Mail } from "@/lib/mail-templates";
import { BODY_END, BODY_START, bodyOf, button, code, greeting, heading, htmlText, join, layoutHtml, layoutText, para, quote } from "@/lib/mail-layout";
import { overCapacityMail, welcomeMail, replyMail } from "@/lib/mail";

// tests/setup.ts blocks sendMail everywhere; here it is the thing under test, with fetch stubbed
const { sendMail } = await vi.importActual<typeof import("@/lib/mail")>("@/lib/mail");

// Names Resend keeps for itself: a template that declares one is refused
const RESERVED = ["FIRST_NAME", "LAST_NAME", "EMAIL", "UNSUBSCRIBE_URL", "RESEND_UNSUBSCRIBE_URL", "contact", "this"];

test("every template takes variables Resend accepts: no reserved name, at most 50, and the greeting", () => {
  for (const key of TEMPLATE_KEYS) {
    const vars = Object.keys(variablesOf(key));
    expect(vars.filter((v) => RESERVED.includes(v)), key).toEqual([]);
    expect(vars.length, key).toBeLessThanOrEqual(50);
    expect(vars, key).toContain("GREETING");
  }
});

test("a template's alias names its key and language", () => {
  expect(aliasOf("magic-link", "es")).toBe("criterio-magic-link-es");
});

test("a missing, extra or mistyped variable never reaches Resend", () => {
  const ok = welcomeMail("https://app.test", "en");
  expect(resendVariables(ok, "Hi Ana,")).toEqual({ URL: "https://app.test", URL_PLAIN: "https://app.test", GOAL: 3, GREETING: "Hi Ana,", GREETING_PLAIN: "Hi Ana," });

  const missing = { ...ok, vars: { URL: "https://app.test" } } as unknown as Mail;
  expect(() => resendVariables(missing, "Hi,")).toThrow(/GOAL/);
  const extra = { ...ok, vars: { ...ok.vars, NAME: "Ana" } } as unknown as Mail;
  expect(() => resendVariables(extra, "Hi,")).toThrow(/NAME/);
  const wrong = { ...ok, vars: { URL: "https://app.test", GOAL: "3" } } as unknown as Mail;
  expect(() => resendVariables(wrong, "Hi,")).toThrow(/GOAL/);
  const noStop = { template: "reply", locale: "en", vars: { WHO: "Bea", MINE: "a", THEIRS: "b", URL: "u", TEAM: "T" } } as unknown as Mail;
  expect(() => resendVariables(noStop, "Hi,"), "a team email without its stop link").toThrow(/STOP_URL/);
});

test("the compiler refuses a template's variables when one is missing or extra", () => {
  // @ts-expect-error GOAL is missing
  mail("welcome", "en", { URL: "u" });
  // @ts-expect-error NAME is not a variable of magic-link
  mail("magic-link", "en", { URL: "u", NAME: "Ana" });
  // @ts-expect-error a team email carries its stop link and team
  mail("reply", "en", { WHO: "a", MINE: "b", THEIRS: "c", URL: "u" });
});

test("someone's words are escaped for the HTML, in text and in an attribute, and go as typed in their twins", () => {
  const m = replyMail({ who: "<b>Eve</b> & co", mine: "5 &lt; 6", theirs: "It's \"fine\"", url: "https://app.test/p/1?a=1&lang=es" }, { team: "Ana & Bea", stopUrl: "https://app.test/unsubscribe?u=1&k=replies" }, "en");
  const v = resendVariables(m, greeting("en", "Ana"));
  expect(v.WHO).toBe("&lt;b&gt;Eve&lt;/b&gt; &amp; co");
  expect(v.MINE).toBe("5 &amp;lt; 6");
  expect(v.THEIRS).toBe("It's &quot;fine&quot;");
  expect(v.URL).toBe("https://app.test/p/1?a=1&amp;lang=es");
  expect(v.TEAM).toBe("Ana &amp; Bea");
  expect([v.WHO_PLAIN, v.THEIRS_PLAIN, v.URL_PLAIN]).toEqual(["<b>Eve</b> & co", "It's \"fine\"", "https://app.test/p/1?a=1&lang=es"]);
});

test("a text variable goes escaped for the HTML and as typed in its raw twin, which the subject reads", () => {
  const m = overCapacityMail("https://app.test/t?a=1&b=2", "Ana & Bea <\"studio\">", "duo", 7, 5, "en");
  const v = resendVariables(m, "Hi,");
  expect(v.TEAM).toBe("Ana &amp; Bea &lt;&quot;studio&quot;&gt;");
  expect(v.TEAM_PLAIN).toBe("Ana & Bea <\"studio\">");
  expect(v.MEMBERS, "a number has no twin").toBe(7);
  expect(v).not.toHaveProperty("MEMBERS_PLAIN");
  expect(Object.keys(v).sort(), "sendMail fills exactly what the template declares").toEqual(Object.keys(variablesOf("over-capacity")).sort());

  const subject = "{{{TEAM}}} has {{{MEMBERS}}} people and the {{{PLAN}}} plan allows {{{LIMIT}}}";
  const plain = throughTwins("over-capacity", subject);
  expect(plain).toBe("{{{TEAM_PLAIN}}} has {{{MEMBERS}}} people and the {{{PLAN_PLAIN}}} plan allows {{{LIMIT}}}");
  expect(throughTwins("over-capacity", plain), "running it again changes nothing").toBe(plain);
  expect(throughTwins("letter", "{{{SUBJECT}}}"), "the letter's subject is raw already").toBe("{{{SUBJECT}}}");
});

test("a template's body reads as plain text the way the blocks write it", () => {
  const blocks = join(para("5 < 6 & ", { href: "https://x.test/?a=1&b=2", text: "R&D" }), heading("1. Create a project"), button("Open \"it\"", "https://x.test/a?b=1&c=2"), code("a@b.test"));
  expect(htmlText(blocks.html)).toBe(blocks.text);

  const edited = `<p style="margin:0">Read <strong>this</strong>&nbsp;now,\n   <em>then</em><br>that &amp; &#8220;more&#x201D;</p>
<ul><li>one</li><li><a href="{{{URL}}}">{{{URL}}}</a></li></ul><div>Ask <a href='mailto:a@b.test'>us</a>.</div><!-- note -->`;
  expect(htmlText(edited)).toBe("Read this now, then\nthat & \u201Cmore\u201D\n\n- one\n- {{{URL}}}\n\nAsk us (mailto:a@b.test).");

  const reformatted = `<p style="margin:0 0 16px;">
                  Open it on a computer:
                </p>
                <table role="presentation">
                  <tr>
                    <td><a
                        href="{{{URL}}}"
                        style="color:#EDE6D6;"
                        >Install the extension</a
                      >
                    </td>
                  </tr>
                </table>`;
  expect(htmlText(reformatted), "Resend's editor breaks the tags across lines").toBe("Open it on a computer:\n\nInstall the extension: {{{URL}}}");
});

test("a template's plain-text part reads every text variable through its raw twin, and never an html variable", () => {
  const body = `<p style="margin:0 0 16px;">Escribiste: {{{MINE}}}</p>
<p style="margin:0 0 16px;">{{{WHO}}} responde: {{{THEIRS}}}</p>
${button("Ver la respuesta", "{{{URL}}}").html}`;
  const text = textPart("reply", "es", body);
  expect(text).toBe(`{{{GREETING_PLAIN}}}

Escribiste: {{{MINE_PLAIN}}}

{{{WHO_PLAIN}}} responde: {{{THEIRS_PLAIN}}}

Ver la respuesta: {{{URL_PLAIN}}}

Eric, Andoni y Alberto

Te llega porque estás en {{{TEAM_PLAIN}}} en criterio.design.
Dejar de recibir estos correos (un clic, sin entrar):
{{{STOP_URL_PLAIN}}}

criterio.design`);
  expect(throughTwins("reply", text), "running it again changes nothing").toBe(text);
  expect(textPart("welcome", "en", "<p>Save {{{GOAL}}} references</p>"), "a number reads as itself").toContain("Save {{{GOAL}}} references");

  for (const key of TEMPLATE_KEYS) {
    const vars = variablesOf(key);
    const part = textPart(key, "en", `<p>${Object.keys(TEMPLATES[key].vars).map((v) => `{{{${v}}}}`).join(" ")}</p>`);
    const read = [...part.matchAll(/\{\{\{(\w+)\}\}\}/g)].map(([, v]) => v);
    expect(read.filter((v) => vars[v] === "text" || vars[v] === "html"), key).toEqual([]);
    expect(read.filter((v) => !(v in vars)), `${key} reads only what it declares`).toEqual([]);
  }
  expect(textPart("letter-team", "en", "ignored"), "the letter's text is the code's own").toContain("{{{BODY_TEXT}}}");
});

test("an email built in code goes through the letter for its foot: none, a team's or the Vault's", () => {
  const body = join(para("Hello ", { href: "https://x.test", text: "there" }), quote("Their <words>"), button("Open", "https://x.test/a?b=1&c=2"));
  expect(body.html).toContain("Their &lt;words&gt;");
  expect(body.text).toBe("Hello there (https://x.test)\n\n\"Their <words>\"\n\nOpen: https://x.test/a?b=1&c=2");
  expect(letter("en", "S", body).template).toBe("letter");
  expect(letter("es", "S", body, { team: "T", stopUrl: "s" })).toMatchObject({ template: "letter-team", vars: { TEAM: "T", STOP_URL: "s" } });
  expect(letter("en", "S", body, { vault: true, stopUrl: "s" })).toMatchObject({ template: "letter-vault", vars: { STOP_URL: "s" } });
  const v = resendVariables(letter("en", "A & B", body), "Hi,");
  expect(v.SUBJECT, "the subject goes raw").toBe("A & B");
  expect(v.BODY, "the body is already HTML").toBe(body.html);
});

test("the layout wraps a body between markers, so laying it out again changes nothing", () => {
  const f = { locale: "en" as const, stop: "team" as const };
  const once = layoutHtml(f, "<p>Body</p>");
  expect(bodyOf(once)).toBe("<p>Body</p>");
  expect(layoutHtml(f, bodyOf(once)!)).toBe(once);
  expect(bodyOf("<p>no markers</p>")).toBeNull();
  expect(once.indexOf(BODY_START)).toBeLessThan(once.indexOf(BODY_END));
  expect(once).toContain("{{{GREETING}}}");
  expect(once).toContain("Eric, Andoni and Alberto");
  expect(once).toContain("You get this because you are in {{{TEAM}}} on criterio.design.");
  expect(once).toContain('href="{{{STOP_URL}}}"');
  expect(layoutHtml({ locale: "es" }, "<p>x</p>"), "no stop link where the email has none").not.toContain("STOP_URL");
  expect(layoutHtml({ locale: "es" }, "<p>x</p>")).toContain("Eric, Andoni y Alberto");
  expect(layoutText({ locale: "en", stop: "vault" }, "{{{BODY_TEXT}}}")).toContain("{{{STOP_URL}}}");
});

test("the greeting uses the first name, and none when the account has no name or only its address", () => {
  expect(greeting("en", "Ana María López")).toBe("Hi Ana,");
  expect(greeting("en", null)).toBe("Hi there,");
  expect(greeting("en", "ana@example.test")).toBe("Hi there,");
  expect(greeting("es", "Bea")).toBe("Hola, Bea,");
  expect(greeting("es", "")).toBe("Hola,");
});

afterEach(() => { vi.unstubAllGlobals(); delete process.env.RESEND_API_KEY; });

test("sendMail sends the template by alias with its variables, and List-Unsubscribe when it has a stop link", async () => {
  const sent: { url: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: { body: string }) => { sent.push({ url, body: JSON.parse(init.body) }); return new Response("{}", { status: 200 }); });
  process.env.RESEND_API_KEY = "re_test";

  await sendMail("nobody@example.invalid", welcomeMail("https://app.test", "es"));
  await sendMail("nobody@example.invalid", replyMail({ who: "Bea", mine: "a", theirs: "b", url: "https://app.test/p/1" }, { team: "T", stopUrl: "https://app.test/unsubscribe?k=replies" }, "en"), { replyTo: "bea@example.invalid" });

  expect(sent[0].url).toBe("https://api.resend.com/emails");
  expect(sent[0].body).toMatchObject({ to: ["nobody@example.invalid"], template: { id: "criterio-welcome-es", variables: { URL: "https://app.test", GOAL: 3, GREETING: "Hola," } } });
  expect(sent[0].body).not.toHaveProperty("headers");
  expect(sent[0].body, "a template sends no html or text of its own").not.toHaveProperty("html");
  expect(sent[1].body).toMatchObject({
    reply_to: "bea@example.invalid",
    template: { id: "criterio-reply-en" },
    headers: { "List-Unsubscribe": "<https://app.test/unsubscribe?k=replies>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  });
});

test("without RESEND_API_KEY the alias and the variables go to .data/last-mail.txt, and nothing is fetched", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await sendMail(["a@example.invalid", "b@example.invalid"], welcomeMail("https://app.test", "en"));
  expect(fetch).not.toHaveBeenCalled();
  expect(await readFile(path.join(process.cwd(), ".data", "last-mail.txt"), "utf8")).toBe("a@example.invalid, b@example.invalid\ncriterio-welcome-en\nGREETING: Hi there,\nURL: https://app.test\nGOAL: 3\n");
});
