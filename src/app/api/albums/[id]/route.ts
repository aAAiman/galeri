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
    const albumId = parseInt(idStr, 10);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, 
              COUNT(DISTINCT am.media_id) AS media_count
       FROM albums a
       LEFT JOIN album_media am ON am.album_id = a.id
       LEFT JOIN media m ON m.id = am.media_id AND m.deleted_at IS NULL AND m.purge_requested_at IS NULL
       WHERE a.id = ?
       GROUP BY a.id`,
      [albumId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Album tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ album: rows[0] });
  } catch (error) {
    console.error("Get album detail error:", error);
    return NextResponse.json(
      { error: "Gagal memuat detail album" },
      { status: 500 }
    );
  }
}

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
    const albumId = parseInt(idStr, 10);

    const body = await request.json();
    const { name, description, coverMediaId } = body;

    const updates: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [];

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { error: "Nama album tidak boleh kosong" },
          { status: 400 }
        );
      }
      updates.push("name = ?");
      params.push(name.trim());
    }

    if (description !== undefined) {
      updates.push("description = ?");
      params.push(description ? description.trim() : null);
    }

    if (coverMediaId !== undefined) {
      if (coverMediaId !== null) {
        // Enforce Invariant 4: cover must belong to this album and not be trashed
        const [coverCheck] = await pool.query<RowDataPacket[]>(
          `SELECT am.media_id 
           FROM album_media am
           JOIN media m ON m.id = am.media_id
           WHERE am.album_id = ? AND am.media_id = ? AND m.deleted_at IS NULL`,
          [albumId, coverMediaId]
        );

        if (coverCheck.length === 0) {
          return NextResponse.json(
            { error: "Media cover harus merupakan anggota aktif dalam album ini" },
            { status: 400 }
          );
        }
      }
      updates.push("cover_media_id = ?");
      params.push(coverMediaId);
    }

    params.push(albumId);
    await pool.query(
      `UPDATE albums SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    return NextResponse.json({
      success: true,
      message: "Album berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update album error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui album" },
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
    const albumId = parseInt(idStr, 10);

    // Deleting album only cascades album_media; originals remain intact
    await pool.query("DELETE FROM albums WHERE id = ?", [albumId]);

    return NextResponse.json({
      success: true,
      message: "Album berhasil dihapus. Foto dan video asli tetap tersimpan.",
    });
  } catch (error) {
    console.error("Delete album error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus album" },
      { status: 500 }
    );
  }
}
