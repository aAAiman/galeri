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
    const { mediaIds } = body;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json(
        { error: "mediaIds array wajib disertakan" },
        { status: 400 }
      );
    }

    for (const mId of mediaIds) {
      await pool.query(
        "UPDATE media SET deleted_at = NULL WHERE id = ?",
        [mId]
      );
    }

    return NextResponse.json({
      success: true,
      message: `${mediaIds.length} media berhasil dipulihkan`,
    });
  } catch (error) {
    console.error("Restore trash error:", error);
    return NextResponse.json(
      { error: "Gagal memulihkan media dari Trash" },
      { status: 500 }
    );
  }
}
