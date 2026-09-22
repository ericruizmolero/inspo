// Esquema de la base de datos (SQLite/libsql vía Drizzle).
// Las tablas user/session/account/verification/organization/member/invitation
// son las que espera Better Auth 1.7 (plugin organization incluido).
// inspo_item es nuestra: cada fila pertenece a un workspace (organization).
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// ─── Better Auth ─────────────────────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
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

// Un workspace = una organization de Better Auth.
// metadata (JSON) lleva { kind: "personal" | "team" }.
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
  empresa: text("empresa").notNull(),
  web: text("web").notNull(),
  /** URL normalizada (sin barra final, minúsculas) para deduplicar dentro del workspace */
  webKey: text("web_key").notNull(),
  /** ISO YYYY-MM-DD */
  fecha: text("fecha").notNull(),
  tipo: text("tipo").notNull().default("Inspiración"),
  /** Etiqueta visible de quién lo puso (nombre del usuario o legado "Ambos") */
  autor: text("autor").notNull(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  comentarios: text("comentarios").notNull().default(""),
  subcomentarios: text("subcomentarios"),
  /** URL de la miniatura manual (Blob en prod, /thumbs/... en local) */
  thumbnailUrl: text("thumbnail_url"),
  /** InspoTags serializado (etiquetas IA) */
  tagsJson: text("tags_json"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("inspo_item_org_idx").on(t.organizationId),
  uniqueIndex("inspo_item_org_web_uq").on(t.organizationId, t.webKey),
]);

// ─── Revisiones de DESIGN.md ─────────────────────────────────────────────────
// La generación automática es la base global por URL (lib/design-store.ts).
// Cada workspace guarda encima sus revisiones: una fila por cambio, con la spec
// completa resultante. La spec vigente del workspace es la de la última fila.

export const designRevision = sqliteTable("design_revision", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  /** URL normalizada (misma que la clave de la caché global) */
  url: text("url").notNull(),
  authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  /** "regeneracion" | "revision" | "reversion" */
  kind: text("kind").notNull().default("revision"),
  /** Sección del DESIGN.md a la que se refiere el comentario (color, tipografia, …) */
  section: text("section"),
  /** Lo que escribió la persona */
  comment: text("comment").notNull().default(""),
  /** Resumen de Claude de qué ha cambiado */
  summary: text("summary").notNull().default(""),
  /** Aviso de Claude si el comentario contradice lo medido en la web */
  warning: text("warning"),
  /** DesignSpec completa tras este cambio */
  specJson: text("spec_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("design_revision_org_url_idx").on(t.organizationId, t.url),
]);

// ─── Comentarios por inspo ───────────────────────────────────────────────────
// Hilo plano por item (como el hilo de un pin de Figma). La nota original del
// item (comentarios/subcomentarios) sigue en inspo_item y se pinta como primer
// mensaje del hilo; aquí van las respuestas de cualquier miembro.

export interface CommentAttachmentRow { url: string; w: number; h: number; name?: string }

export const inspoComment = sqliteTable("inspo_comment", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull().references(() => inspoItem.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
  /** Nombre en el momento de escribir (por si el usuario desaparece) */
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  /** Capturas adjuntas: JSON `[{ url, w, h, name }]` (URLs privadas de Blob o rutas de /public en local) */
  attachments: text("attachments", { mode: "json" }).$type<CommentAttachmentRow[]>().notNull().default([]),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  editedAt: integer("edited_at", { mode: "timestamp_ms" }),
}, (t) => [
  index("inspo_comment_org_item_idx").on(t.organizationId, t.itemId),
]);

// ─── Uso de IA ───────────────────────────────────────────────────────────────
// Una fila por llamada a un modelo (Claude o Jev), con su coste estimado en USD
// según la tarifa vigente al escribir (lib/usage.ts). Base del pricing del SaaS.

export const aiUsage = sqliteTable("ai_usage", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  /** design_md | vision | jev_tag | jev_search | jev_recursos | explain | revise */
  action: text("action").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
  /** Unidades facturadas por item (Jev): items puntuados o etiquetados */
  units: integer("units").notNull().default(0),
  /** Coste estimado en microdólares (USD × 1e6) para no perder precisión en enteros */
  costMicros: integer("cost_micros").notNull().default(0),
  /** URL, consulta… lo que ayude a explicar la fila */
  ref: text("ref"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("ai_usage_org_created_idx").on(t.organizationId, t.createdAt),
]);

// ─── Actividad (presencia) ───────────────────────────────────────────────────
// Un segmento = una persona en una zona de la app (biblioteca, DESIGN.md, equipo…)
// dentro de una visita (pestaña). El cliente manda un latido cada 20 s mientras la
// pestaña está visible (components/useActivity.ts) y el servidor suma el tiempo
// entre latidos (lib/activity.ts). Alimenta el panel de /admin.

export const activitySegment = sqliteTable("activity_segment", {
  /** Lo genera el cliente (uno por visita × zona); solo lo puede tocar su dueño */
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organization.id, { onDelete: "set null" }),
  /** Una visita = una carga de la app en una pestaña */
  visitId: text("visit_id").notNull(),
  /** Zona de la app: biblioteca | busqueda | design-md | comentarios | recursos | anadir | equipo | planes | admin… */
  area: text("area").notNull(),
  path: text("path").notNull(),
  /** Resumen legible del navegador: "Chrome · macOS" */
  device: text("device"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  /** Segundos con la pestaña visible en esta zona */
  seconds: integer("seconds").notNull().default(0),
}, (t) => [
  index("activity_segment_user_seen_idx").on(t.userId, t.lastSeenAt),
  index("activity_segment_seen_idx").on(t.lastSeenAt),
]);

// ─── Administradores de la app ───────────────────────────────────────────────
// Quién puede ver el panel de actividad (/admin). Se gestiona desde el propio panel
// (lib/activity.ts); los correos fijos de DEFAULT_ADMINS / ADMIN_EMAILS no van aquí.

export const appAdmin = sqliteTable("app_admin", {
  /** Correo en minúsculas */
  email: text("email").primaryKey(),
  /** Nombre de quien le dio acceso (para enseñarlo en la lista) */
  addedBy: text("added_by").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// ─── Feedback visual (Agentation) ────────────────────────────────────────────
// Cada nota que alguien deja con la barra de feedback sobre la propia app. Se guardan
// según llegan y se mandan por correo a los socios (los del panel /admin) en lotes:
// al pulsar enviar/copiar o cuando pasa un rato sin notas nuevas (lib/feedback.ts).
export const feedbackNote = sqliteTable("feedback_note", {
  /** `${id de la anotación}@${userId}`: el id lo genera Agentation en el navegador */
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organization.id, { onDelete: "set null" }),
  /** Ruta de la página anotada (agrupa el lote) y URL completa para el enlace del correo */
  path: text("path").notNull(),
  url: text("url").notNull(),
  /** "1440×900" en el momento de anotar */
  viewport: text("viewport"),
  /** Anotación completa de Agentation en JSON (elemento, selector, texto, estilos…) */
  data: text("data").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  /** Cuándo salió el correo con esta nota; null = pendiente de enviar */
  sentAt: integer("sent_at", { mode: "timestamp_ms" }),
}, (t) => [
  index("feedback_note_pending_idx").on(t.sentAt, t.updatedAt),
  index("feedback_note_user_path_idx").on(t.userId, t.path),
]);
