import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { RowDataPacket } from "mysql2";

export async function GET(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read trash retention days from app_settings
    const [settings] = await pool.query<RowDataPacket[]>(
      "SELECT trash_retention_days FROM app_settings WHERE id = 1"
    );
    const retentionDays = settings[0]?.trash_retention_days || 30;

    // List trashed items with thumbnail variant
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT m.id, m.original_filename, m.storage_key, m.mime_type, m.file_size,
              m.media_type, m.duration_seconds, m.width, m.height, m.is_favorite,
              m.deleted_at, m.uploaded_at,
              v.storage_key as thumbnail_storage_key,
              GREATEST(0, ? - DATEDIFF(NOW(), m.deleted_at)) AS days_remaining
       FROM media m
       LEFT JOIN media_variants v ON v.media_id = m.id AND v.variant_type = 'thumbnail'
       WHERE m.deleted_at IS NOT NULL AND m.purge_requested_at IS NULL
       ORDER BY m.deleted_at DESC`,
      [retentionDays]
    );

    return NextResponse.json({
      items,
      retentionDays,
      totalCount: items.length,
    });
  } catch (error) {
    console.error("Trash list error:", error);
    return NextResponse.json(
      { error: "Gagal memuat item Trash" },
      { status: 500 }
    );
  }
}
