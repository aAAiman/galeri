import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { RowDataPacket } from "mysql2";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idStr } = await context.params;
    const mediaId = parseInt(idStr, 10);

    const [mediaRows] = await pool.query<RowDataPacket[]>(
      `SELECT m.*, v.storage_key as thumbnail_storage_key
       FROM media m
       LEFT JOIN media_variants v ON v.media_id = m.id AND v.variant_type = 'thumbnail'
       WHERE m.id = ? AND m.deleted_at IS NULL AND m.purge_requested_at IS NULL`,
      [mediaId]
    );

    if (!mediaRows || mediaRows.length === 0) {
      return NextResponse.json(
        { error: "Media tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get albums this media belongs to
    const [albumRows] = await pool.query<RowDataPacket[]>(
      `SELECT a.id, a.name
       FROM albums a
       JOIN album_media am ON am.album_id = a.id
       WHERE am.media_id = ?`,
      [mediaId]
    );

    return NextResponse.json({
      media: mediaRows[0],
      albums: albumRows,
    });
  } catch (error) {
    console.error("Get media detail error:", error);
    return NextResponse.json(
      { error: "Gagal memuat detail media" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idStr } = await context.params;
    const mediaId = parseInt(idStr, 10);

    // Soft delete media: set deleted_at = NOW()
    const [result] = await pool.query(
      "UPDATE media SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
      [mediaId]
    );

    return NextResponse.json({
      success: true,
      message: "Media dipindahkan ke Trash",
    });
  } catch (error) {
    console.error("Soft delete media error:", error);
    return NextResponse.json(
      { error: "Gagal memindahkan media ke Trash" },
      { status: 500 }
    );
  }
}
