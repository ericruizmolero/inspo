// The name an item gets when only its address arrives (the app, the extension).
import "server-only";
import { guessName, videoEmbedOf, postOf } from "./url";
import { siteTextWithin, videoTitleWithin } from "./extract";
import { readPost, postName } from "./posts";

/** A post on X by its author and first words; a video link by its title (oEmbed; a video file
 *  by its file name); a site by what it says of itself. `title` is a fallback someone already has. */
export async function nameFor(web: string, title?: string): Promise<string> {
  if (postOf(web)) {
    const post = await readPost(web);
    if (post) return postName(post);
  }
  const video = videoEmbedOf(web);
  if (video?.provider === "file") return guessName(web, null);
  const videoTitle = video ? await videoTitleWithin(web) : null;
  if (videoTitle) return guessName(web, { title: videoTitle });
  return guessName(web, (await siteTextWithin(web)) ?? (title ? { title } : null));
}
