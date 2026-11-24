// The apps that read a pasted link to draw its preview: Telegram, WhatsApp, Slack, X, iMessage (which says it is
// Facebook's and X's), LinkedIn, Discord… They come with no session, so a reference's link (/i/<id>) lets them in
// to read its title and picture (lib/share-card.ts) instead of sending them to the login page.
// Edge-safe: proxy.ts reads it too.
export const PREVIEW_BOT = /facebookexternalhit|facebookcatalog|Twitterbot|TelegramBot|WhatsApp|Slackbot|Slack-ImgProxy|LinkedInBot|Discordbot|SkypeUriPreview|redditbot|vkShare|Pinterestbot|Iframely|Embedly|Mastodon|Bluesky/i;

export const isPreviewBot = (ua: string | null | undefined) => !!ua && PREVIEW_BOT.test(ua);

// The AIs that open a link pasted in their chat (Claude, ChatGPT, Perplexity, Gemini, Mistral, Copilot…) and any
// client that is not a browser (curl, an agent's own fetch): they read the reference whole (lib/share-reader.ts)
// instead of landing on the login, where they said they could not see the image. Every browser says "Mozilla/"
export const AI_READER = /Claude|anthropic|ChatGPT|OpenAI|OAI-SearchBot|GPTBot|Perplexity|Google-Extended|GoogleAgent|Gemini|Bard|MistralAI|cohere|DuckAssistBot|YouBot|Meta-External|Copilot|bingbot|Bytespider|Amazonbot|Applebot|PhindBot|Kagi|Manus|Grok|xAI/i;

export const isAiReader = (ua: string | null | undefined) => !ua || AI_READER.test(ua) || !/Mozilla\//.test(ua);
