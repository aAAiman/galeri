import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { mediaIds, albumId } = body;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0 || !albumId) {
      return NextResponse.json(
        { error: "mediaIds dan albumId wajib disertakan" },
        { status: 400 }
      );
    }

    const [albumCheck] = await pool.query<RowDataPacket[]>(
      "SELECT id, name FROM albums WHERE id = ?",
      [albumId]
    );

    if (albumCheck.length === 0) {
      return NextResponse.json(
        { error: "Album tujuan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Insert ignore to prevent duplicate membership error
    for (const mId of mediaIds) {
      await pool.query(
        "INSERT IGNORE INTO album_media (album_id, media_id, added_at) VALUES (?, ?, NOW())",
        [albumId, mId]
      );
    }

    return NextResponse.json({
      success: true,
      message: `${mediaIds.length} media berhasil ditambahkan ke album "${albumCheck[0].name}"`,
    });
  } catch (error) {
    console.error("Add media to album error:", error);
    return NextResponse.json(
      { error: "Gagal menambahkan media ke album" },
      { status: 500 }
    );
  }
}
