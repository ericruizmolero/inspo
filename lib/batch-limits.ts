// What one request of a many-at-once save carries (lib/add-many.ts). Client-safe: a pasted board is sent
// in batches from the app, as the extension sends its imports (BATCH and BATCH_IMAGES in extension/chrome/import.js).

/** Addresses per request: enough to move fast, few enough to answer well within the limit */
export const MAX_PER_BATCH = 25;
/** Per request when images come: the server copies each one before it answers */
export const MAX_IMAGES_PER_BATCH = 10;
