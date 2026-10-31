import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

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

    for (const mId of mediaIds) {
      await pool.query(
        "DELETE FROM album_media WHERE album_id = ? AND media_id = ?",
        [albumId, mId]
      );
    }

    return NextResponse.json({
      success: true,
      message: `${mediaIds.length} media dikeluarkan dari album`,
    });
  } catch (error) {
    console.error("Remove media from album error:", error);
    return NextResponse.json(
      { error: "Gagal mengeluarkan media dari album" },
      { status: 500 }
    );
  }
}
