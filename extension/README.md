# criterio.design browser extension

Saves the site you're looking at to your criterio.design library with one click. The extension doesn't
analyze anything itself: it sends the address, the tab title and a screenshot of what's visible, and the
server picks the name, collection, tags and thumbnail, the same as when you paste a URL in the app.

The popup follows the browser language: English by default, Spanish when the browser is in Spanish.
Every text lives in `chrome/_locales/<lang>/messages.json` (Chrome's own i18n; `popup.js` reads them
with `chrome.i18n.getMessage`). To add a language, copy `_locales/en` and translate the messages.

## How people get it

`criterio.design/extension/install` is the guide: download, load it in Chrome, connect, save the first
site. While the extension is not in the Chrome Web Store it is installed by hand, from the zip the
guide links to (`/extension/download`, built from `extension/chrome` at build time, without the
localhost entries). Right after it is installed the extension opens the guide (or reloads it if it is
already open), the page sees it and offers to connect. Settings → Browser extension links to the guide,
and so does the library: `content.js` runs on every page of the app, and a browser where the extension
is missing or has no key gets an "Install extension" button beside the + (`useExtensionMissing`).

The guide also knows the installed version (`content.js` says it) and tells the person when the zip
is newer. A hand-installed extension does not update itself: bump `version` in `manifest.json` with
every change that should reach people, and they download it again.

## How it signs in

It doesn't use the site's session cookie (Safari doesn't allow that reliably). The last step of the
guide, or pressing "Connect to criterio.design" in the popup (which opens
`criterio.design/extension/connect`), creates a long key (`crit_…`), which the extension stores in `chrome.storage.local`. Every
call goes with `Authorization: Bearer crit_…` to the versioned routes under `/api/ext/v1/`:

| Route | What it does |
|---|---|
| `GET /me` | Checks the key; returns the person and workspace |
| `DELETE /me` | The extension revokes its own key when it disconnects |
| `GET /items/lookup?url=` | Is this site already saved? |
| `POST /items` | Saves `{ url, title, screenshot, note, projectId, areas }` |
| `POST /items/batch` | Saves up to 25 `{ url, title }` at once, into `projectId` (the import page); with `image`, the item is that image |
| `POST /media` | Saves one image or video from the right-click menu |
| `GET /projects` | The projects to save to, and the one picked first |
| `POST /projects` | Creates `{ name }` and answers `{ project: { id, name } }`: the project a board lands in |

Keys are listed and revoked in **Settings → Extension**. A key stops working on its own if the person leaves the
workspace. The database only stores the key's SHA-256.

## Right-click: one image or video

`background.js` adds "Save image to criterio.design" and "Save video to criterio.design" to the context
menu (`contextMenus` permission). The click grants `activeTab`, so the service worker finds the element
on the page by its address, cuts the piece of the visible tab it covers, keeps both in
`chrome.storage.session` and opens the popup (`chrome.action.openPopup`; where Chrome refuses, the same
page in a small window). The popup reads it once and shows the image or video instead of the tab.

- **An image** is fetched by the server (with the page as `Referer`, since some sites refuse a bare
  request) and stored in the workspace's media folder, the same as an image dropped into the app. When the
  site still refuses, or the image is a `blob:`, the cut piece of the tab is stored instead.
- **A video** is copied whole into the workspace's video folder (`inspo/<workspace>/video/`, up to
  100 MB), so it plays from criterio whatever its site does with the link later, with the cut piece as its
  frame. When the page plays it from a `blob:` (a stream in pieces), the extension looks for the real file
  first: a `<source>` of its own, or the biggest video file the page fetched. With no file to copy, it
  saves the post or video page the video belongs to (a post on X has its video copied on import; YouTube,
  Vimeo and Loom play embedded), and only when there is none, the page and its frame. The popup says so.

## The form

A site and a right-clicked image or video get the same form as the board's add dialog: what caught the
eye, the project (`GET /projects` lists them and says which one this person last added to, picked
first) and the areas of its system. `lib/ext-file.ts` files the item there and hangs it under each area
ticked. After saving, the button turns into "Saved" with a check, and the form folds away.

## Importing bookmarks and boards

The popup's import row opens `import.html` in a tab of its own (the popup closes as soon as it loses
focus, and an import takes minutes). Three kinds of source, one entry each in `SOURCES` in
`import.js`:

- **This browser**: the bookmark folders (`bookmarks` permission), ticked by folder; only `http(s)`
  addresses go.
- **X**: Chrome asks for `https://x.com/*` (an optional permission, granted on the click), the page opens
  `x.com/i/bookmarks` in a new tab and injects `x-collect.js` with `chrome.scripting`. The collector
  scrolls to the end, reporting each post's address as it appears (`a[href*="/status/"]` with a
  `<time>` inside, which is how a post's own permalink looks), and stops after ~11 s without anything
  new, when the import page says stop, or when that page is gone. If the person is not signed in to X
  it reports `logged-out`. There is no official API involved: if X changes its markup, this selector
  is what to fix.
- **A board on Are.na, Pinterest or Cosmos**: its address, pasted, or already there when the import
  started from the board itself (the button on the page, or the popup on that tab). `boards.js` is the
  one place that knows the three platforms: which addresses are a board, the hosts Chrome is asked for
  (the site and its API, optional, granted on the click) and the collector that reads it. The page opens
  the board in a tab behind it and injects `boards.js`, `board-collect.js` and the platform's collector,
  and closes that tab at the end. Every collector reports through `board-collect.js` with one shape:
  `{ type: "board-found", name?, total?, items: [{ url, title?, image?, text? }], skipped: { [reason]: n } }`
  for each page it reads (`name` and `total` ride on the first), then `{ type: "board-done", reason, name }`.
  None of the three is scrolled or clicked, and none is an official API except Are.na's:
  - `arena-collect.js` reads `api.are.na/v3/channels/<slug>/contents`, 100 blocks a page, at most 30
    requests a minute. A Link is its site, Media (a video by address) its address, an Image its file
    and a Text its words, with the block's page (`are.na/block/<id>`) as where it came from. Attachments
    and channels inside the channel are skipped and counted. The API refuses a request that
    carries the session, so a private channel reads as not found.
  - `pinterest-collect.js` asks Pinterest for the board's pins as the board's own page does
    (`/resource/BoardResource/get/`, `BoardFeedResource`, `BoardSectionsResource` and
    `BoardSectionPinsResource`, 25 pins a page, with the `X-Pinterest-PWS-Handler` header Pinterest
    wants), so it gets exactly what is on the board, sections included, and not the "more ideas" the
    page shows under it. A secret board needs the person signed in to Pinterest in that browser. A pin
    that links to a site is that site. An uploaded pin is its image, `{ url: the pin, title, image: [...] }`:
    at 1200 px when the original is wider than 1600, the original otherwise and always for a GIF; a
    video or a pin of several pages is its cover. If Pinterest changes these, `call()` is what to fix.
  - `cosmos-collect.js` takes the cluster's number from the page and asks `api.cosmos.so/graphql`
    for its elements with the page's own `GetClusterElements` query, trimmed, with the session so a
    private cluster works. A website, a product or a website still being read (`BaseElementTile`) is its
    site; an image or a video is its file (a video, its cover) with the element's page
    (`cosmos.so/e/<id>`) as where it came from; a text is its words, with the same page. If Cosmos changes
    it, `QUERY` is what to fix.

  Each image is copied by the server into the workspace's media folder under a key made from its page
  (`importedMediaKey`), so importing the same board again saves nothing twice. Up to 1000 items a run,
  10 a request when a batch carries images.

The app's Import dialog (Conectores → Import) can open this page too: it posts `open-import` with
`what: "x" | "browser"`, `content.js` passes it on and the service worker opens `import.html?source=<what>`
next to the app's tab, only for a tab of an origin this build may reach (0.7.1 and later).

The page asks which project bookmarks and posts land in (the same field as the popup's form, the one
this person last added to picked first). A board lands in a project named after it instead: `POST /projects { name }` answers with
the one an earlier import made, from here or from the app, or makes it (`projectForBoard` in
`lib/projects.ts`; when the server can't answer, the picked project). What the workspace already had is
filed in that project too, since a reference can be in several; "Open the project" at the end goes there.

The addresses go to `POST /items/batch` in batches of 25, one request at a time, and the page shows the
counts (found, saved, already here, skipped, failed). A board ends with what came in by kind and what
stayed out and why: "38 websites, 12 images and 2 texts imported. 3 skipped (file)." The server names, tags and
gets the thumbnail of each one after answering, as when a URL is pasted in the app: an import of a few
hundred bookmarks is done in a few minutes, the cards fill in over the following ones.

## The button on a board

Once the person grants a platform (on the import page or from the popup), `background.js` registers
`board-button.js` on its pages with `chrome.scripting.registerContentScripts`, and unregisters it when
the permission is taken back (`syncBoardButtons`, on install, startup and every permission change).
Nothing is registered at install. On a board the script draws one pill in the bottom right corner,
"Import to Criterio" with the mark, in a closed shadow root: paper, ink border and bevel, Archivo from
`fonts/` (loaded with `FontFace` under a name of its own), the ember focus ring, a fade without the rise
under reduced motion. These sites change pages without loading, so it looks at the address twice a
second and leaves when it is not a board. The click asks the service worker to open the import page
on that board, which starts on its own. The popup on a board offers the same import ("Import this
board"); Chrome asks for the platform there, on the click.

## Workspaces

One key per browser, and it opens every workspace the person belongs to. Each request says where to
act with the `X-Workspace` header (an id from `/api/ext/v1/me`, which lists them); without it, the
workspace the key was created in. The popup shows the choice as the pill at the top right, and
remembers it. A workspace the person is not in gets a 403.

## Look

The popup and the import page use the Criterio design system: its tokens are copied at the top of
`popup.css` (keep them equal to `app/globals.css`). The popup is product chrome, so it stays dark in both
system themes, with beveled paper buttons and the ember Save. Archivo and Bricolage Grotesque are bundled
in `chrome/fonts` (SIL OFL, source in its README), so nothing loads from Google. The popup shows the tab
as it will look in the library: the shot, the favicon, the title and the address. The
icons in `chrome/icons` are `public/logo.png` with the mark's rounded corners; regenerate them from there
when the mark changes.

## Try it in Chrome (developer mode)

1. `chrome://extensions` → turn on "Developer mode" (top right).
2. "Load unpacked" → pick the `extension/chrome` folder.
3. Pin the extension to the toolbar and open it on any site.

To test against the local server, open "I already have a key" in the popup and set the server to
`http://localhost:<port>`; create the key at `http://localhost:<port>/extension/connect`.

## Safari

The code is the same. Safari requires packaging it inside a Mac app with Xcode:
`xcrun safari-web-extension-converter extension/chrome`. That happens once the Chrome one is
published.

## Publish to the Chrome Web Store

Zip the `extension/chrome` folder and upload it to the Chrome developer dashboard
(one-time $5 fee). Before uploading, bump `version` in `manifest.json`.
The store listing takes the name and description from `_locales` too, so it shows up translated.
