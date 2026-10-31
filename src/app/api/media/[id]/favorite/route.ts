import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { RowDataPacket } from "mysql2";

export async function PATCH(
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

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT is_favorite FROM media WHERE id = ? AND deleted_at IS NULL",
      [mediaId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Media tidak ditemukan atau sudah di Trash" },
        { status: 404 }
      );
    }

    const currentFav = Boolean(rows[0].is_favorite);
    const newFav = !currentFav;

    await pool.query("UPDATE media SET is_favorite = ? WHERE id = ?", [
      newFav ? 1 : 0,
      mediaId,
    ]);

    return NextResponse.json({
      success: true,
      isFavorite: newFav,
      message: newFav
        ? "Ditambahkan ke Favorit"
        : "Dihapus dari Favorit",
    });
  } catch (error) {
    console.error("Toggle favorite error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui status favorit" },
      { status: 500 }
    );
  }
}
