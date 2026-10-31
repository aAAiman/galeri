import { NextRequest, NextResponse } from "next/server";
import { withTransaction, pool } from "@/lib/db/connection";
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
    const { mediaIds, targetAlbumId } = body;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0 || !targetAlbumId) {
      return NextResponse.json(
        { error: "mediaIds dan targetAlbumId wajib disertakan" },
        { status: 400 }
      );
    }

    // Verify target album exists
    const [albumCheck] = await pool.query<RowDataPacket[]>(
      "SELECT id, name FROM albums WHERE id = ?",
      [targetAlbumId]
    );

    if (albumCheck.length === 0) {
      return NextResponse.json(
        { error: "Album tujuan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Run transactional Move: delete all previous album memberships for mediaIds, then insert new
    await withTransaction(async (conn) => {
      for (const mId of mediaIds) {
        await conn.query("DELETE FROM album_media WHERE media_id = ?", [mId]);
        await conn.query(
          "INSERT INTO album_media (album_id, media_id, added_at) VALUES (?, ?, NOW())",
          [targetAlbumId, mId]
        );
      }
    });

    return NextResponse.json({
      success: true,
      message: `${mediaIds.length} media berhasil dipindahkan ke album "${albumCheck[0].name}"`,
    });
  } catch (error) {
    console.error("Move media error:", error);
    return NextResponse.json(
      { error: "Gagal memindahkan media antaralbum" },
      { status: 500 }
    );
  }
}
