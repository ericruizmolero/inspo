// Database schema (Postgres via Drizzle).
// The user/session/account/verification/organization/member/invitation tables
// are the ones Better Auth 1.7 expects (organization plugin included).
// inspo_item is ours: each row belongs to a workspace (organization).
import { sql } from "drizzle-orm";
import { pgTable, text, integer, boolean, timestamp, jsonb, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import type { InspoTags } from "@/types/inspo";

/** CHECK that a text column holds one of these values */
const oneOf = (name: string, col: Parameters<typeof sql>[1], values: readonly string[]) =>
  check(name, sql`${col} in (${sql.join(values.map((v) => sql.raw(`'${v}'`)), sql`, `)})`);
// Better Auth stores several roles comma-separated ("owner,admin")
const ROLE_LIST = sql.raw(`'^(owner|admin|member)(,(owner|admin|member))*$'`);

// ─── Better Auth ─────────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** The person's language ("en" | "es"). Decides the language of the emails they get. */
  language: text("language").notNull().default("en"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("active_organization_id"),
  activeTeamId: text("active_team_id"),
}, (t) => [index("session_user_id_idx").on(t.userId)]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true, mode: "date" }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true, mode: "date" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [index("account_user_id_idx").on(t.userId)]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [index("verification_identifier_idx").on(t.identifier)]);

// A workspace = a Better Auth organization. kind and plan are our columns, declared to
// Better Auth as additionalFields (lib/auth.ts). metadata is Better Auth's and we leave it empty.
export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  metadata: text("metadata"),
  /** "personal" (one per person, created by lib/workspace-core.ts) | "team" */
  kind: text("kind").notNull().default("team"),
  /** SaaS plan (lib/plans.ts), changed by hand with scripts/set-plan.ts */
  plan: text("plan").notNull().default("solo"),
}, (t) => [
  oneOf("organization_kind_check", t.kind, ["personal", "team"]),
  oneOf("organization_plan_check", t.plan, ["solo", "studio", "agency"]),
]);

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [
  index("member_organization_id_idx").on(t.organizationId),
  index("member_user_id_idx").on(t.userId),
  uniqueIndex("member_org_user_uq").on(t.organizationId, t.userId),
  check("member_role_check", sql`${t.role} ~ ${ROLE_LIST}`),
]);

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  teamId: text("team_id"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  inviterId: text("inviter_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (t) => [
  index("invitation_organization_id_idx").on(t.organizationId),
  index("invitation_email_idx").on(t.email),
  index("invitation_inviter_id_idx").on(t.inviterId),
  check("invitation_role_check", sql`${t.role} ~ ${ROLE_LIST}`),
  oneOf("invitation_status_check", t.status, ["pending", "accepted", "rejected", "canceled"]),
]);

// ─── Inspo ───────────────────────────────────────────────────────────────────

export const inspoItem = pgTable("inspo_item", {
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
  tagsJson: jsonb("tags_json").$type<InspoTags>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [
  index("inspo_item_org_idx").on(t.organizationId),
  uniqueIndex("inspo_item_org_web_uq").on(t.organizationId, t.webKey),
  index("inspo_item_created_by_idx").on(t.createdBy),
  oneOf("inspo_item_type_check", t.type, ["inspiration", "videos", "ideas", "documentaries"]),
]);

// ─── DESIGN.md revisions ─────────────────────────────────────────────────────
// The automatic generation is the global base per URL (lib/design-store.ts).
// Each workspace stores its revisions on top: one row per change, with the full
// resulting spec. The workspace's current spec is the one in the latest row.

export const designRevision = pgTable("design_revision", {
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
  specJson: jsonb("spec_json").$type<unknown>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [
  index("design_revision_org_url_idx").on(t.organizationId, t.url),
  index("design_revision_author_id_idx").on(t.authorId),
  oneOf("design_revision_kind_check", t.kind, ["regeneration", "revision", "reversion"]),
]);

// ─── Why it's here ──────────────────────────────────────────────────────────
// The DESIGN.md is global per URL, but the reason a site is in a library is the team's:
// the note of whoever saved it and the thread. A model connects those words with what
// was measured, and the result is cached here until the words or the spec change.
export const designWhy = pgTable("design_why", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  /** Normalized URL (same as the global cache key) */
  url: text("url").notNull(),
  /** Fingerprint of the voices and the spec version this answer was built from */
  stamp: text("stamp").notNull(),
  model: text("model").notNull(),
  /** DesignWhy as JSON */
  whyJson: jsonb("why_json").$type<unknown>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [
  uniqueIndex("design_why_org_url_idx").on(t.organizationId, t.url),
]);

// ─── Comments per inspo ──────────────────────────────────────────────────────
// Flat thread per item (like a Figma pin thread). The item's original note
// (comments/subcomments) stays in inspo_item and renders as the first message
// of the thread; replies from any member go here.

export interface CommentAttachmentRow { url: string; w: number; h: number; name?: string }

export const inspoComment = pgTable("inspo_comment", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull().references(() => inspoItem.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
  /** Name at the time of writing (in case the user is gone) */
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  /** Attached screenshots: JSON `[{ url, w, h, name }]` (private Blob URLs, or /public paths locally) */
  attachments: jsonb("attachments").$type<CommentAttachmentRow[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  editedAt: timestamp("edited_at", { withTimezone: true, mode: "date" }),
}, (t) => [
  index("inspo_comment_org_item_idx").on(t.organizationId, t.itemId),
  // Deleting an item cascades here by item_id alone, which the index above cannot serve
  index("inspo_comment_item_id_idx").on(t.itemId),
  index("inspo_comment_author_id_idx").on(t.authorId),
]);

// ─── AI usage ────────────────────────────────────────────────────────────────
// One row per model call (Claude or Jev), with its estimated cost in USD
// at the rate current when written (lib/usage.ts). The basis for SaaS pricing.

export const aiUsage = pgTable("ai_usage", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  /** design_md | vision | jev_tag | jev_search | jev_directory | explain | revise | design_why */
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
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [
  index("ai_usage_org_created_idx").on(t.organizationId, t.createdAt),
  index("ai_usage_user_id_idx").on(t.userId),
  oneOf("ai_usage_action_check", t.action, ["design_md", "vision", "jev_tag", "jev_search", "jev_directory", "explain", "revise", "design_why"]),
  oneOf("ai_usage_cost_source_check", t.costSource, ["real", "estimated"]),
]);

// ─── Activity (presence) ─────────────────────────────────────────────────────
// A segment = one person in one area of the app (library, DESIGN.md, team…)
// within one visit (tab). The client sends a heartbeat every 20 s while the
// tab is visible (components/useActivity.ts) and the server adds up the time
// between heartbeats (lib/activity.ts). Feeds the /admin panel.

export const activitySegment = pgTable("activity_segment", {
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
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" }).notNull(),
  /** Seconds with the tab visible in this area */
  seconds: integer("seconds").notNull().default(0),
}, (t) => [
  index("activity_segment_user_seen_idx").on(t.userId, t.lastSeenAt),
  index("activity_segment_seen_idx").on(t.lastSeenAt),
  index("activity_segment_org_idx").on(t.organizationId),
]);

// ─── App admins ──────────────────────────────────────────────────────────────
// Who can see the activity panel (/admin). Managed from the panel itself
// (lib/activity.ts); the fixed emails in DEFAULT_ADMINS / ADMIN_EMAILS are not stored here.

export const appAdmin = pgTable("app_admin", {
  /** Lowercase email */
  email: text("email").primaryKey(),
  /** Name of who granted access (shown in the list) */
  addedBy: text("added_by").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

// ─── Visual feedback (Agentation) ────────────────────────────────────────────
// Each note someone leaves with the feedback bar on the app itself. Stored as
// they arrive and emailed to the partners (the /admin panel list) in batches:
// on send/copy, or after a while with no new notes (lib/feedback.ts).
export const feedbackNote = pgTable("feedback_note", {
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
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  /** When the email with this note went out; null = not sent yet */
  sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" }),
  /** When a partner marked it as dealt with in /admin; null = open. Only sent notes get resolved */
  resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
}, (t) => [
  index("feedback_note_pending_idx").on(t.sentAt, t.updatedAt),
  index("feedback_note_user_path_idx").on(t.userId, t.path),
  index("feedback_note_org_idx").on(t.organizationId),
]);

// ─── Browser extension keys ─────────────────────────────────────────────────
// The extension does not use the session cookie (Safari cannot anyway): on connect,
// the person picks a workspace at /extension/connect and gets a long key that the
// extension stores. Only the key's SHA-256 digest lives here, never the key.
// Each key works for one workspace; revoke it from /settings/extension or the extension itself.
export const extKey = pgTable("ext_key", {
  id: text("id").primaryKey(),
  /** Hex SHA-256 of the full key */
  hash: text("hash").notNull(),
  /** First characters of the key (to recognize it in the list) */
  prefix: text("prefix").notNull(),
  /** Label the person sets: "Laptop Chrome" */
  name: text("name").notNull().default(""),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "date" }),
  /** null = active */
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
}, (t) => [
  uniqueIndex("ext_key_hash_idx").on(t.hash),
  index("ext_key_org_idx").on(t.organizationId),
  index("ext_key_user_idx").on(t.userId),
]);
