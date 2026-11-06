// The apps that read a pasted link to draw its preview: Telegram, WhatsApp, Slack, X, iMessage (which says it is
// Facebook's and X's), LinkedIn, Discord… They come with no session, so a reference's link (/i/<id>) lets them in
// to read its title and picture (lib/share-card.ts) instead of sending them to the login page.
// Edge-safe: proxy.ts reads it too.
export const PREVIEW_BOT = /facebookexternalhit|facebookcatalog|Twitterbot|TelegramBot|WhatsApp|Slackbot|Slack-ImgProxy|LinkedInBot|Discordbot|SkypeUriPreview|redditbot|vkShare|Pinterestbot|Iframely|Embedly|Mastodon|Bluesky/i;

export const isPreviewBot = (ua: string | null | undefined) => !!ua && PREVIEW_BOT.test(ua);
