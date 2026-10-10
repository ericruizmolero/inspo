import { createHash } from "crypto";

/** Hex SHA-256: what the database keeps of a secret shown only once (extension keys, MCP tokens, invite codes) */
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
