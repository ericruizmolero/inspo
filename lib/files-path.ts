// The path a stored file loads from in the app (app/api/files/[...key]), for code on either side.
// lib/storage.ts writes the same paths on the server.
export const fileUrl = (key: string) => `/api/files/${key}`;
