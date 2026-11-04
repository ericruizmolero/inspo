# Testing the agent setup

Criterio now sets up a project from your own agent, and builds a landing from it. This is live on `app.criterio.design`. We need people to break it before strangers see it.

It takes about 30 minutes. Use a real brand if you can, because invented ones hide problems.

Work in a test project, or in a workspace you don't mind cluttering. This is production: what you create is real.

## Before you start

You need a Criterio account and at least one of these: Claude Code, Cursor, Codex, ChatGPT, or Claude on the web or desktop.

Claude Code is the fastest way in. Type these inside Claude Code, in an empty folder:

```
/plugin marketplace add ericruizmolero/inspo
/plugin install criterio@criterio
```

Then run `/mcp`, pick `criterio`, and sign in. Press Allow in the browser.

Already installed it? Update first, in your normal terminal, and start a new session:

```sh
claude plugin marketplace update criterio
claude plugin update criterio@criterio
```

Any other client connects by address. Add a custom connector with `https://app.criterio.design/mcp`, and sign in. The Connectors menu in the app has the steps for each client.

## Test 1: the setup in your agent

Run `/criterio:setup`. In other clients, say "set up criterio".

You should get:

1. Tino's drawing.
2. A conversation with Tino, one question at a time. He should never mention tools, MCP or calls.
3. A question about which project, or a new one.
4. A look for your brand. Give it your site, or say you have none.
5. The goal first. You can answer "I don't know" to the other questions.
6. A request for landing pages you like, and what to take from each. You can skip this.
7. Your `criterio.md`, written. This can take a minute or two.
8. An offer to build a landing.

Then try to break it:

- Skip the brand and the references. The setup must still finish, with a thin file.
- Stop halfway, start a new session, and run the setup again. Nothing should be asked twice.
- Open the link Tino gives you while your browser is in another workspace. It must open the right project.
- Start a project on the website and finish it in your agent.

## Test 2: build a landing

Say yes to the offer. Give it 2 or 3 references and your real texts and photos, if you have them. Real material changes the result more than anything else.

You should get:

1. Two heroes with the same copy and a different direction, and a question about which serves the goal better and why.
2. A plan of sections, each with a job towards the goal.
3. The landing, built section by section.
4. Marks like `[proof needed: ...]` wherever a claim has no backing. Tino must never invent a figure, a client or a quote.

Afterwards, check the project in the app. Your pick should be under "What was learned", and the plan under "The landing".

Publish the page somewhere public, or use a preview, and ask Tino to check it. He should report what fails, such as no action on the first phone screen.

## Test 3: the website

Create an empty project in the app. You should see About, Questions and References.

Press "Ask the client" on Questions, open the copied link in a private window, answer, and press Send. Check three things:

- The page shows only the project name and the open questions, with no sign-in.
- Whoever made the link gets one email.
- The answers show as "From the client", and the file does not change until someone runs a new pass.

In the System page, open the "…" menu and use "Answer the questions". Tino's last note should ask you to connect your agent.

## Test 4: comments on a page

You need the browser extension, version 0.8.0 or later. Get it at `app.criterio.design/extension/install`. An older install has no comment button.

1. Open your landing: a local page, a preview or a live site.
2. Open the extension, choose the project, and press "Comment on this page".
3. Click an element, write, and send.
4. Ask your agent to read the comments, fix them and close them.
5. In the System "…" menu, "Comments on the page" should show what is still open.

## Test 5: the moving ears

This one needs Claude on the web or desktop, or ChatGPT. Say "set up criterio" in a new chat. Tino should appear with his ears moving, and only his ears.

In Claude Code the drawing stays still. That is expected.

## What we already know

- Tino's drawing can arrive after his first tool call, or very rarely not at all. A model prints it, so we can't force it.
- Only Claude Code has a plugin. The other clients use the connector, and Claude Code is the only one anyone has tried so far.
- Safari builds, but nobody has tested it. Use Chrome for Test 4.
- A landing with no references or real material comes out generic. That is why Tino asks for them.
- The marketing site still talks about a design system. That is on purpose for now.

## What to send back

For each problem, send:

- Which client you used, and which test.
- What you did, what you expected, and what happened.
- A screenshot, and the project's link.

Tell us the good part too. Which step felt like a form? Where did you stop trusting it? Did the landing serve its goal, or could it be anyone's?
