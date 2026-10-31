# GaleriKita — ERD MySQL v1.0

**Basis:** PRD GaleriKita v1.1 (31 Oktober 2026). 2 users, 1 shared password, no accounts. Next.js + MySQL + Linux private file storage. Media quota 50 GB (50,000,000,000 bytes).

**Files**
- `galerikita_erd.mmd` — Editable Mermaid ERD.
- `galerikita_schema.sql` — Reference MySQL DDL for 8 tables (MySQL 8.0.16+, InnoDB). Review before execution.

## Entities

| Table | Purpose |
|---|---|
| app_settings | Argon2id shared password hash, session version, global media quota and reservations |
| sessions | Secure session token hashes, expiry and revocation; no users table |
| media | Original media metadata, favorite, trash, deletion lifecycle, path key |
| albums | Album details and nullable media cover |
| album_media | Many-to-many membership, composite PK prevents duplicates |
| media_variants | Thumbnail/poster/preview derivatives and size accounting |
| upload_sessions | tusd upload tracking, optional target album, upload quota reservation |
| processing_jobs | Persistent job queue for Sharp/FFmpeg/metadata/purge |

## Invariants

1. Home query lists every `media` row whose `deleted_at IS NULL` and `purge_requested_at IS NULL`, whether or not it has albums.
2. Move means transactionally DELETE existing `album_media` rows for selected media and INSERT target membership; Add only INSERTs; Remove deletes only selected membership.
3. Album delete cascades memberships, not originals; media hard-delete cascades memberships, variants metadata and jobs. Filesystem deletes must be orchestrated and retried by the app/worker; FK cascades cannot delete physical bytes.
4. `albums.cover_media_id` references an existing media row, but **application validation must ensure the media belongs to that album and is not trashed**; the simple FK doesn't enforce membership.
5. `sessions.token_hash` stores SHA-256 of a random session token, not the raw cookie token. `app_settings.password_hash` stores Argon2id hash, not password plaintext. Change password increments `session_version` (invalidate prior sessions).
6. The `app_settings` row with `id=1` must be seeded with a real password hash. No mock passwords are included.
7. `used_bytes + reserved_bytes <= storage_quota_bytes` is enforced under a row-level lock/atomic transaction when authorizing uploads, completing uploads, and reserving derivative processing. Upload temporary bytes are covered by their reservation, not counted a second time.
8. Local filesystem contents (originals, derived files, temporary files and Trash) are within the 50 GB gallery media budget. Existing MySQL data files outside the dedicated gallery filesystem volume are not automatically counted by an OS filesystem quota; count them separately if you need a strict 50 GiB cap for *all* application bytes.
9. Completed tusd uploads must be validated and finalized idempotently into `media` and optional `album_media`. `tus_upload_id` and `media_id` uniqueness help prevent double finalization; the application also needs an atomic/idempotent workflow.
10. Purge/delete requires an application worker coordinating filesystem and MySQL, including retries and reconciliation after crashes. DB transactions alone cannot atomically commit file deletions.
11. Database table creation does not configure reverse proxy/TLS, private path access, rate limiting, session enforcement, upload hook auth, file type validation, or disk quota: application and deployment implement them.
12. Production files should be stored by opaque `storage_key` outside the Next.js `public` directory.

## Simple queries / usage

Home:
```sql
SELECT id, original_filename, media_type, taken_at, uploaded_at
FROM media
WHERE deleted_at IS NULL AND purge_requested_at IS NULL
ORDER BY COALESCE(taken_at, uploaded_at) DESC, id DESC
LIMIT 50;
```

Get files in an album:
```sql
SELECT m.* FROM album_media am
JOIN media m ON m.id = am.media_id
WHERE am.album_id = ? AND m.deleted_at IS NULL AND m.purge_requested_at IS NULL
ORDER BY am.added_at DESC;
```

Move to one album (run using one transaction on ONE pooled connection, after validating IDs):
```sql
START TRANSACTION;
DELETE FROM album_media WHERE media_id = ?;
INSERT INTO album_media (album_id, media_id) VALUES (?, ?);
COMMIT;
```

Adding to another album (non-destructive):
```sql
INSERT IGNORE INTO album_media (album_id, media_id) VALUES (?, ?);
```

**Note:** Run operations in server-side authenticated APIs; don't expose SQL queries or storage paths to clients.
