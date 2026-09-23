// Database schema (SQLite/libsql via Drizzle).
// The user/session/account/verification/organization/member/invitation tables
// are the ones Better Auth 1.7 expects (organization plugin included).
// inspo_item is ours: each row belongs to a workspace (organization).
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// ─── Better Auth ─────────────────────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  /** The person's language ("en" | "es"). Decides the language of the emails they get. */
  language: text("language").notNull().default("en"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("activeOrganizationId"),
  activeTeamId: text("activeTeamId"),
}, (t) => [index("session_userId_idx").on(t.userId)]);

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("account_userId_idx").on(t.userId)]);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("verification_identifier_idx").on(t.identifier)]);

// A workspace = a Better Auth organization.
// metadata (JSON) holds { kind: "personal" | "team" }.
export const organization = sqliteTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  metadata: text("metadata"),
});

export const member = sqliteTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("member_organizationId_idx").on(t.organizationId),
  index("member_userId_idx").on(t.userId),
  uniqueIndex("member_org_user_uq").on(t.organizationId, t.userId),
]);

export const invitation = sqliteTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull().references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  teamId: text("teamId"),
  status: text("status").notNull().default("pending"),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  inviterId: text("inviterId").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (t) => [
  index("invitation_organizationId_idx").on(t.organizationId),
  index("invitation_email_idx").on(t.email),
]);

// ─── Inspo ───────────────────────────────────────────────────────────────────

export const inspoItem = sqliteTable("inspo_item", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  web: text("web").notNull(),
  /** Normalized URL (no trailing slash, lowercase) to dedupe within the workspace */
  webKey: text("web_key").notNull(),
  /** ISO YYYY-MM-DD */
  date: text("date").notNull(),
  type: text("type").notNull().default("inspiration"),
  /** Visible label of who added it (user name or legacy "Both") */
  author: text("author").notNull(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  note: text("note").notNull().default(""),
  subNote: text("sub_note"),
  /** URL of the manual thumbnail (Blob in prod, /thumbs/... locally) */
  thumbnailUrl: text("thumbnail_url"),
  /** Serialized InspoTags (AI tags) */
  tagsJson: text("tags_json"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("inspo_item_org_idx").on(t.organizationId),
  uniqueIndex("inspo_item_org_web_uq").on(t.organizationId, t.webKey),
]);

// ─── DESIGN.md revisions ─────────────────────────────────────────────────────
// The automatic generation is the global base per URL (lib/design-store.ts).
// Each workspace stores its revisions on top: one row per change, with the full
// resulting spec. The workspace's current spec is the one in the latest row.

export const designRevision = sqliteTable("design_revision", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  /** Normalized URL (same as the global cache key) */
  url: text("url").notNull(),
  authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  /** "regeneration" | "revision" | "reversion" */
  kind: text("kind").notNull().default("revision"),
  /** DESIGN.md section the comment refers to (color, typography, …) */
  section: text("section"),
  /** What the person wrote */
  comment: text("comment").notNull().default(""),
  /** Claude's summary of what changed */
  summary: text("summary").notNull().default(""),
  /** Claude's warning if the comment contradicts what was measured on the site */
  warning: text("warning"),
  /** Full DesignSpec after this change */
  specJson: text("spec_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("design_revision_org_url_idx").on(t.organizationId, t.url),
]);

// ─── Comments per inspo ──────────────────────────────────────────────────────
// Flat thread per item (like a Figma pin thread). The item's original note
// (comments/subcomments) stays in inspo_item and renders as the first message
// of the thread; replies from any member go here.

export interface CommentAttachmentRow { url: string; w: number; h: number; name?: string }

export const inspoComment = sqliteTable("inspo_comment", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull().references(() => inspoItem.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
  /** Name at the time of writing (in case the user is gone) */
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  /** Attached screenshots: JSON `[{ url, w, h, name }]` (private Blob URLs, or /public paths locally) */
  attachments: text("attachments", { mode: "json" }).$type<CommentAttachmentRow[]>().notNull().default([]),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  editedAt: integer("edited_at", { mode: "timestamp_ms" }),
}, (t) => [
  index("inspo_comment_org_item_idx").on(t.organizationId, t.itemId),
]);

// ─── AI usage ────────────────────────────────────────────────────────────────
// One row per model call (Claude or Jev), with its estimated cost in USD
// at the rate current when written (lib/usage.ts). The basis for SaaS pricing.

export const aiUsage = sqliteTable("ai_usage", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  /** design_md | vision | jev_tag | jev_search | jev_directory | explain | revise */
  action: text("action").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
  /** Units billed per item (Jev): items scored or tagged */
  units: integer("units").notNull().default(0),
  /** Cost in micro-dollars (USD × 1e6) to keep precision in integers */
  costMicros: integer("cost_micros").notNull().default(0),
  /** "real": what OpenRouter charged for that call. "estimated": computed by us (#28) */
  costSource: text("cost_source").notNull().default("estimated"),
  /** Provider that served the call on OpenRouter (DeepInfra, Anthropic…) */
  provider: text("provider"),
  /** OpenRouter call id, to match it against their log */
  requestId: text("request_id"),
  /** URL, query… whatever helps explain the row */
  ref: text("ref"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("ai_usage_org_created_idx").on(t.organizationId, t.createdAt),
]);

// ─── Activity (presence) ─────────────────────────────────────────────────────
// A segment = one person in one area of the app (library, DESIGN.md, team…)
// within one visit (tab). The client sends a heartbeat every 20 s while the
// tab is visible (components/useActivity.ts) and the server adds up the time
// between heartbeats (lib/activity.ts). Feeds the /admin panel.

export const activitySegment = sqliteTable("activity_segment", {
  /** Generated by the client (one per visit × area); only its owner can touch it */
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organization.id, { onDelete: "set null" }),
  /** A visit = one load of the app in one tab */
  visitId: text("visit_id").notNull(),
  /** App area: library | search | design-md | comments | directory | add | team | plans | settings | admin… */
  area: text("area").notNull(),
  path: text("path").notNull(),
  /** Readable browser summary: "Chrome · macOS" */
  device: text("device"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  /** Seconds with the tab visible in this area */
  seconds: integer("seconds").notNull().default(0),
}, (t) => [
  index("activity_segment_user_seen_idx").on(t.userId, t.lastSeenAt),
  index("activity_segment_seen_idx").on(t.lastSeenAt),
]);

// ─── App admins ──────────────────────────────────────────────────────────────
// Who can see the activity panel (/admin). Managed from the panel itself
// (lib/activity.ts); the fixed emails in DEFAULT_ADMINS / ADMIN_EMAILS are not stored here.

export const appAdmin = sqliteTable("app_admin", {
  /** Lowercase email */
  email: text("email").primaryKey(),
  /** Name of who granted access (shown in the list) */
  addedBy: text("added_by").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// ─── Visual feedback (Agentation) ────────────────────────────────────────────
// Each note someone leaves with the feedback bar on the app itself. Stored as
// they arrive and emailed to the partners (the /admin panel list) in batches:
// on send/copy, or after a while with no new notes (lib/feedback.ts).
export const feedbackNote = sqliteTable("feedback_note", {
  /** `${annotation id}@${userId}`: Agentation generates the id in the browser */
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organization.id, { onDelete: "set null" }),
  /** Path of the annotated page (groups the batch) and full URL for the email link */
  path: text("path").notNull(),
  url: text("url").notNull(),
  /** "1440×900" at the time of annotating */
  viewport: text("viewport"),
  /** Full Agentation annotation as JSON (element, selector, text, styles…) */
  data: text("data").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  /** When the email with this note went out; null = not sent yet */
  sentAt: integer("sent_at", { mode: "timestamp_ms" }),
}, (t) => [
  index("feedback_note_pending_idx").on(t.sentAt, t.updatedAt),
  index("feedback_note_user_path_idx").on(t.userId, t.path),
]);

// ─── Browser extension keys ─────────────────────────────────────────────────
// The extension does not use the session cookie (Safari cannot anyway): on connect,
// the person picks a workspace at /extension/connect and gets a long key that the
// extension stores. Only the key's SHA-256 digest lives here, never the key.
// Each key works for one workspace; revoke it from /settings/extension or the extension itself.
export const extKey = sqliteTable("ext_key", {
  id: text("id").primaryKey(),
  /** Hex SHA-256 of the full key */
  hash: text("hash").notNull(),
  /** First characters of the key (to recognize it in the list) */
  prefix: text("prefix").notNull(),
  /** Label the person sets: "Laptop Chrome" */
  name: text("name").notNull().default(""),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
  /** null = active */
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
}, (t) => [
  uniqueIndex("ext_key_hash_idx").on(t.hash),
  index("ext_key_org_idx").on(t.organizationId),
  index("ext_key_user_idx").on(t.userId),
]);
