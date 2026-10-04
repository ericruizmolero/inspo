// Database schema (Postgres via Drizzle).
// The user/session/account/verification/organization/member/invitation tables
// are the ones Better Auth 1.7 expects (organization plugin included).
// inspo_item is ours: each row belongs to a workspace (organization).
import { sql } from "drizzle-orm";
import { pgTable, text, integer, real, boolean, timestamp, jsonb, index, uniqueIndex, check, primaryKey, vector, type AnyPgColumn } from "drizzle-orm/pg-core";
import type { InspoTags, UserTags } from "@/types/inspo";
import type { PolishState, Why } from "@/types/polish";

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
  /** Path of the manual thumbnail (/api/files/…, lib/storage.ts) */
  thumbnailUrl: text("thumbnail_url"),
  /** Serialized InspoTags (AI tags) */
  tagsJson: jsonb("tags_json").$type<InspoTags>(),
  /** The workspace's own edits on top of the AI tags: they survive a new tagging (lib/taxonomy.ts viewOf) */
  tagsUser: jsonb("tags_user").$type<UserTags>(),
  /** The tagging job (lib/tag-jobs.ts): pending → running → done | failed */
  tagStatus: text("tag_status").notNull().default("pending"),
  tagAttempts: integer("tag_attempts").notNull().default(0),
  /** When the running attempt started: a run older than the job's limit was lost and can be claimed again */
  tagStartedAt: timestamp("tag_started_at", { withTimezone: true, mode: "date" }),
  tagError: text("tag_error"),
  /** What it means, for search by meaning (lib/embed.ts): name, tags, notes and thread, embedded.
   *  Null = to embed (again): the worker fills it. */
  embedding: vector("embedding", { dimensions: 1024 }),
  embeddingAt: timestamp("embedding_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [
  index("inspo_item_org_idx").on(t.organizationId),
  uniqueIndex("inspo_item_org_web_uq").on(t.organizationId, t.webKey),
  index("inspo_item_created_by_idx").on(t.createdBy),
  // The cron's sweep: only the few rows not done
  index("inspo_item_tag_status_idx").on(t.tagStatus).where(sql`${t.tagStatus} <> 'done'`),
  index("inspo_item_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  // Rows tagged with another taxonomy (lib/tag-jobs.ts claimable)
  index("inspo_item_tags_version_idx").on(sql`coalesce((${t.tagsJson}->>'v')::int, 0)`).where(sql`${t.tagStatus} = 'done'`),
  // The embed worker's backlog, newest first (lib/embed.ts embedPending: read backwards, it matches DESC)
  index("inspo_item_embed_pending_idx").on(t.createdAt).where(sql`${t.embedding} is null and ${t.tagStatus} = 'done'`),
  // The same address in other workspaces, whose tags a new save can copy (lib/tagger.ts)
  index("inspo_item_web_key_idx").on(t.webKey),
  oneOf("inspo_item_type_check", t.type, ["inspiration", "videos", "ideas", "documentaries"]),
  oneOf("inspo_item_tag_status_check", t.tagStatus, ["pending", "running", "done", "failed"]),
]);

// ─── Projects ────────────────────────────────────────────────────────────────
// Spaces inside a workspace to file references by what they are for (a landing,
// a UI library…). An item can be in several projects; one in none is in the Inbox.
// Filing never copies the item: the DESIGN.md, tags and thread stay the item's.

export const project = pgTable("project", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  /** Polish: the brief, the decisions taken on the board and the last run of the games (types/polish.ts) */
  polish: jsonb("polish").$type<PolishState>(),
  /** Set when this is a template, not a project: where the work started and where it ended (types/system.ts ProjectTemplate) */
  template: jsonb("template").$type<unknown>(),
  /** The recipe: how the work was done, as a Markdown document an agent can follow (the process of a template) */
  recipe: text("recipe").notNull().default(""),
  /** When the team said it had its references: until then the project opens on its board, gathering; after, on its system */
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [
  index("project_org_idx").on(t.organizationId),
  index("project_created_by_idx").on(t.createdBy),
]);

export const projectItem = pgTable("project_item", {
  projectId: text("project_id").notNull().references(() => project.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull().references(() => inspoItem.id, { onDelete: "cascade" }),
  /** Repeated here so a whole workspace's links load in one query */
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  addedBy: text("added_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  /** Set when the reference leaves the board but stays with the project (Polish: "lo que no pesa"); null on the board */
  archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
  /** What the team takes from this reference for this project: the "why" (types/polish.ts) */
  why: jsonb("why").$type<Why>(),
}, (t) => [
  primaryKey({ columns: [t.projectId, t.itemId] }),
  index("project_item_org_idx").on(t.organizationId),
  index("project_item_item_idx").on(t.itemId),
  index("project_item_added_by_idx").on(t.addedBy),
]);

// ─── Canvas ──────────────────────────────────────────────────────────────────
// Where each reference sits on a space's canvas, in canvas units (a tile is 360 wide).
// The space is "all", "inbox" or a project id: plain text, so a project's rows are removed
// by hand when it goes (lib/canvas.ts). A reference with no row is placed automatically.

export const canvasPosition = pgTable("canvas_position", {
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  space: text("space").notNull(),
  itemId: text("item_id").notNull().references(() => inspoItem.id, { onDelete: "cascade" }),
  x: real("x").notNull(),
  y: real("y").notNull(),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.organizationId, t.space, t.itemId] }),
  index("canvas_position_item_idx").on(t.itemId),
  index("canvas_position_updated_by_idx").on(t.updatedBy),
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
// One kind of thing: a comment on a reference. Pinned (anchor set) it is a post-it at a place on the page;
// without an anchor it is about the whole reference. Either can have replies, one level deep (a reply has
// a parent_id, no anchor and no replies of its own). The item's original note stays in inspo_item and
// opens the list.

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
  /** The comment this one answers. Null: a comment of its own (pinned or about the whole reference) */
  parentId: text("parent_id").references((): AnyPgColumn => inspoComment.id, { onDelete: "cascade" }),
  /** A post-it pinned on the page: x and y as 0..1 of the image box, and the page height (in 1440px-wide
   *  pixels) when it was pinned, so the pin keeps its place if a new capture changes the page's height.
   *  All three null: a comment about the whole reference, or a reply. */
  anchorX: real("anchor_x"),
  anchorY: real("anchor_y"),
  anchorH: integer("anchor_h"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  editedAt: timestamp("edited_at", { withTimezone: true, mode: "date" }),
}, (t) => [
  index("inspo_comment_org_item_idx").on(t.organizationId, t.itemId),
  check("inspo_comment_anchor_check", sql`(${t.anchorX} is null) = (${t.anchorY} is null) and (${t.anchorX} is null) = (${t.anchorH} is null)`),
  // Deleting an item cascades here by item_id alone, which the index above cannot serve
  index("inspo_comment_item_id_idx").on(t.itemId),
  index("inspo_comment_author_id_idx").on(t.authorId),
  // A reply sits under its comment, never on the page
  check("inspo_comment_reply_check", sql`${t.parentId} is null or ${t.anchorX} is null`),
  index("inspo_comment_parent_id_idx").on(t.parentId),
]);

// ─── AI usage ────────────────────────────────────────────────────────────────
// One row per model call (Claude or Jev), with its estimated cost in USD
// at the rate current when written (lib/usage.ts). The basis for SaaS pricing.

export const aiUsage = pgTable("ai_usage", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  /** design_md | vision | jev_tag | jev_search | jev_directory | explain | revise | design_why | polish | auto_tag | query_en | embed | system */
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
  // Monthly quota count (lib/quota.ts): one workspace, one action, since the 1st
  index("ai_usage_org_action_created_idx").on(t.organizationId, t.action, t.createdAt),
  index("ai_usage_user_id_idx").on(t.userId),
  oneOf("ai_usage_action_check", t.action, ["design_md", "vision", "jev_tag", "jev_search", "jev_directory", "explain", "revise", "design_why", "polish", "auto_tag", "query_en", "embed", "system"]),
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

// ─── The project's system ────────────────────────────────────────────────────
// What a project has decided about its design, area by area, alive from the first reference:
// the board feeds it, the team confirms it, agents read it (criterio.md). One row per project
// holds the summary and the last run; one row per area holds the decision as it stands. Every
// change to an area leaves a revision, so the system can be read back in time.

export const SYSTEM_AREA_KEYS = ["typography", "color", "layout", "motion", "iconography", "logo", "imagery", "voice"] as const;

export const projectSystem = pgTable("project_system", {
  projectId: text("project_id").primaryKey().references(() => project.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  /** The project's criterio in one paragraph, written by the model from the board; empty until the first run */
  summary: text("summary").notNull().default(""),
  /** The last model run: which references it read, with which prompt, when (types/system.ts SystemRun) */
  runJson: jsonb("run_json").$type<unknown>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [index("project_system_org_idx").on(t.organizationId)]);

export const systemArea = pgTable("system_area", {
  projectId: text("project_id").notNull().references(() => project.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  /** One of SYSTEM_AREA_KEYS */
  area: text("area").notNull(),
  /** The decision as it stands; empty = the project has not decided this yet */
  decision: text("decision").notNull().default(""),
  /** 0-100: how far the board backs the decision. 0 when empty */
  confidence: integer("confidence").notNull().default(0),
  /** References behind the decision and what each one brings: [{ itemId, take }] (types/system.ts) */
  evidence: jsonb("evidence").$type<unknown>().notNull().default([]),
  /** "model": proposed from the board, the next run may change it. "team": written or confirmed by a person, runs leave it alone. null: empty */
  source: text("source"),
  decidedBy: text("decided_by").references(() => user.id, { onDelete: "set null" }),
  /** The criterio behind the decision: why this and not the rest, in the team's words (or the agent's, until confirmed) */
  why: text("why").notNull().default(""),
  /** What this area must never do, one rule per line: what the team tried and threw away, so no one proposes it again */
  never: text("never").notNull().default(""),
  /** The agent's curation of the candidates the board offers for this area: kept or discarded, each with its reason (types/system.ts AreaCuration) */
  curationJson: jsonb("curation_json").$type<unknown>(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.projectId, t.area] }),
  index("system_area_org_idx").on(t.organizationId),
  oneOf("system_area_area_check", t.area, SYSTEM_AREA_KEYS),
  check("system_area_source_check", sql`${t.source} is null or ${t.source} in ('model', 'team')`),
  check("system_area_confidence_check", sql`${t.confidence} between 0 and 100`),
]);

/** The team talking about one area of a project's system: what they think of the decision, what they would try */
export const systemAreaComment = pgTable("system_area_comment", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => project.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  area: text("area").notNull(),
  authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
  /** Name at the time of writing (in case the user is gone) */
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  /** What the line is about: an option tried on the sample ({ choice, label }) or a reference ({ itemId }). Null: the area as a whole */
  about: jsonb("about").$type<unknown>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [
  index("system_area_comment_project_idx").on(t.projectId, t.area, t.createdAt),
  index("system_area_comment_org_idx").on(t.organizationId),
  oneOf("system_area_comment_area_check", t.area, SYSTEM_AREA_KEYS),
]);

export const systemAreaRevision = pgTable("system_area_revision", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => project.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  area: text("area").notNull(),
  decision: text("decision").notNull(),
  confidence: integer("confidence").notNull(),
  evidence: jsonb("evidence").$type<unknown>().notNull().default([]),
  /** "model" | "team" */
  source: text("source").notNull(),
  why: text("why").notNull().default(""),
  authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
  /** The person, or the model name */
  authorName: text("author_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [
  index("system_area_revision_project_idx").on(t.projectId, t.area, t.createdAt),
  index("system_area_revision_org_idx").on(t.organizationId),
  index("system_area_revision_author_idx").on(t.authorId),
  oneOf("system_area_revision_source_check", t.source, ["model", "team"]),
]);
