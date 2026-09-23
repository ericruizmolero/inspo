# criterio.design browser extension

Saves the site you're looking at to your criterio.design library with one click. The extension doesn't
analyze anything itself: it sends the address, the tab title and a screenshot of what's visible, and the
server picks the name, collection, tags and thumbnail, the same as when you paste a URL in the app.

The popup follows the browser language: English by default, Spanish when the browser is in Spanish.
Every text lives in `chrome/_locales/<lang>/messages.json` (Chrome's own i18n; `popup.js` reads them
with `chrome.i18n.getMessage`). To add a language, copy `_locales/en` and translate the messages.

## How it signs in

It doesn't use the site's session cookie (Safari doesn't allow that reliably). Pressing
"Connect to criterio.design" opens `criterio.design/extension/connect`: there you pick the workspace and
a long key (`crit_…`) is created, which the extension stores in `chrome.storage.local`. Every
call goes with `Authorization: Bearer crit_…` to the versioned routes under `/api/ext/v1/`:

| Route | What it does |
|---|---|
| `GET /me` | Checks the key; returns the person and workspace |
| `DELETE /me` | The extension revokes its own key when it disconnects |
| `GET /items/lookup?url=` | Is this site already saved? |
| `POST /items` | Saves `{ url, title, screenshot }` |

Keys are listed and revoked in **Settings → Extension**. A key stops working on its own if the person leaves the
workspace. The database only stores the key's SHA-256.

## Look

The popup uses the app's tokens (`app/globals.css`), dark by default and light when the system prefers it,
and shows the tab as it will look in the library: the shot, the favicon, the title and the address. The
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
