import {
  mysqlTable,
  int,
  varchar,
  text,
  bigint,
  datetime,
  boolean,
  decimal,
  mysqlEnum,
  primaryKey,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// 1. App Settings
export const appSettings = mysqlTable("app_settings", {
  id: int("id").primaryKey().default(1),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  sessionVersion: int("session_version").notNull().default(1),
  storageQuotaBytes: bigint("storage_quota_bytes", { mode: "number", unsigned: true })
    .notNull()
    .default(50000000000),
  usedBytes: bigint("used_bytes", { mode: "number", unsigned: true })
    .notNull()
    .default(0),
  reservedBytes: bigint("reserved_bytes", { mode: "number", unsigned: true })
    .notNull()
    .default(0),
  trashRetentionDays: int("trash_retention_days").notNull().default(30),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// 2. Sessions
export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    sessionVersion: int("session_version").notNull().default(1),
    expiresAt: datetime("expires_at").notNull(),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_sessions_token_hash").on(table.tokenHash),
    index("idx_sessions_expires_at").on(table.expiresAt),
  ]
);

// 3. Media
export const media = mysqlTable(
  "media",
  {
    id: int("id").autoincrement().primaryKey(),
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    storageKey: varchar("storage_key", { length: 255 }).notNull().unique(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    fileSize: bigint("file_size", { mode: "number", unsigned: true }).notNull(),
    mediaType: mysqlEnum("media_type", ["image", "video"]).notNull(),
    durationSeconds: decimal("duration_seconds", { precision: 10, scale: 2 }),
    width: int("width"),
    height: int("height"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    deletedAt: datetime("deleted_at"),
    purgeRequestedAt: datetime("purge_requested_at"),
    takenAt: datetime("taken_at"),
    uploadedAt: datetime("uploaded_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_media_home").on(
      table.deletedAt,
      table.purgeRequestedAt,
      table.takenAt,
      table.uploadedAt
    ),
    index("idx_media_favorite").on(table.isFavorite, table.deletedAt),
  ]
);

// 4. Albums
export const albums = mysqlTable("albums", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  coverMediaId: int("cover_media_id").references(() => media.id, {
    onDelete: "set null",
  }),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// 5. Album Media (Many-to-Many Membership)
export const albumMedia = mysqlTable(
  "album_media",
  {
    albumId: int("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    mediaId: int("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    addedAt: datetime("added_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.albumId, table.mediaId] }),
    index("idx_album_media_media").on(table.mediaId),
  ]
);

// 6. Media Variants
export const mediaVariants = mysqlTable(
  "media_variants",
  {
    id: int("id").autoincrement().primaryKey(),
    mediaId: int("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    variantType: mysqlEnum("variant_type", [
      "thumbnail",
      "poster",
      "preview",
    ]).notNull(),
    storageKey: varchar("storage_key", { length: 255 }).notNull().unique(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    fileSize: bigint("file_size", { mode: "number", unsigned: true }).notNull(),
    width: int("width"),
    height: int("height"),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_variants_media_type").on(table.mediaId, table.variantType),
  ]
);

// 7. Upload Sessions
export const uploadSessions = mysqlTable(
  "upload_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tusUploadId: varchar("tus_upload_id", { length: 128 }).unique(),
    targetAlbumId: int("target_album_id").references(() => albums.id, {
      onDelete: "set null",
    }),
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    expectedBytes: bigint("expected_bytes", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    uploadedBytes: bigint("uploaded_bytes", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .default(0),
    status: mysqlEnum("status", [
      "pending",
      "uploading",
      "completed",
      "failed",
      "cancelled",
    ])
      .notNull()
      .default("pending"),
    reservedBytes: bigint("reserved_bytes", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .default(0),
    expiresAt: datetime("expires_at").notNull(),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_upload_status").on(table.status, table.expiresAt)]
);

// 8. Processing Jobs
export const processingJobs = mysqlTable(
  "processing_jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    mediaId: int("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    jobType: mysqlEnum("job_type", [
      "thumbnail",
      "video_poster",
      "metadata",
      "purge",
    ]).notNull(),
    status: mysqlEnum("status", [
      "queued",
      "processing",
      "completed",
      "failed",
    ])
      .notNull()
      .default("queued"),
    attempts: int("attempts").notNull().default(0),
    maxAttempts: int("max_attempts").notNull().default(3),
    errorMessage: text("error_message"),
    scheduledAt: datetime("scheduled_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    completedAt: datetime("completed_at"),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_jobs_queue").on(table.status, table.scheduledAt)]
);
