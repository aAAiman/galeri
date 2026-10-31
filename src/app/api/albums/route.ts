import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export async function GET(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    const whereClause = search ? "WHERE a.name LIKE ?" : "";
    const params = search ? [`%${search}%`] : [];

    // Query albums with count of active media and effective cover
    const sql = `
      SELECT 
        a.id, 
        a.name, 
        a.description, 
        a.cover_media_id,
        a.created_at, 
        a.updated_at,
        COUNT(DISTINCT am.media_id) AS media_count,
        COALESCE(
          a.cover_media_id,
          (
            SELECT am2.media_id 
            FROM album_media am2 
            JOIN media m2 ON m2.id = am2.media_id 
            WHERE am2.album_id = a.id AND m2.deleted_at IS NULL AND m2.purge_requested_at IS NULL
            ORDER BY am2.added_at DESC LIMIT 1
          )
        ) AS effective_cover_id
      FROM albums a
      LEFT JOIN album_media am ON am.album_id = a.id
      LEFT JOIN media m ON m.id = am.media_id AND m.deleted_at IS NULL AND m.purge_requested_at IS NULL
      ${whereClause}
      GROUP BY a.id
      ORDER BY a.updated_at DESC, a.id DESC
    `;

    const [albums] = await pool.query<RowDataPacket[]>(sql, params);
    return NextResponse.json({ albums });
  } catch (error) {
    console.error("List albums error:", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar album" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Nama album wajib diisi" },
        { status: 400 }
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO albums (name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
      [name.trim(), description?.trim() || null]
    );

    return NextResponse.json({
      success: true,
      albumId: result.insertId,
      name: name.trim(),
    });
  } catch (error) {
    console.error("Create album error:", error);
    return NextResponse.json(
      { error: "Gagal membuat album baru" },
      { status: 500 }
    );
  }
}
