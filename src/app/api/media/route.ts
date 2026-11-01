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

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all, photo, video
    const sort = searchParams.get("sort") || "date_taken_desc";
    const search = searchParams.get("search")?.trim() || "";
    const albumId = searchParams.get("albumId");
    const favoriteOnly = searchParams.get("favoriteOnly") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [
      "m.deleted_at IS NULL",
      "m.purge_requested_at IS NULL",
    ];
    const whereParams: unknown[] = [];

    if (filter === "photo") {
      whereClauses.push("m.media_type = 'image'");
    } else if (filter === "video") {
      whereClauses.push("m.media_type = 'video'");
    }

    if (favoriteOnly) {
      whereClauses.push("m.is_favorite = 1");
    }

    if (search) {
      whereClauses.push("m.original_filename LIKE ?");
      whereParams.push(`%${search}%`);
    }

    let joinAlbumClause = "";
    const joinAlbumParams: unknown[] = [];
    if (albumId) {
      joinAlbumClause = "JOIN album_media am ON am.media_id = m.id AND am.album_id = ?";
      joinAlbumParams.push(parseInt(albumId, 10));
    }

    let orderByClause = "COALESCE(m.taken_at, m.uploaded_at) DESC, m.id DESC";
    if (sort === "date_taken_asc") {
      orderByClause = "COALESCE(m.taken_at, m.uploaded_at) ASC, m.id ASC";
    } else if (sort === "date_uploaded_desc") {
      orderByClause = "m.uploaded_at DESC, m.id DESC";
    } else if (sort === "date_uploaded_asc") {
      orderByClause = "m.uploaded_at ASC, m.id ASC";
    } else if (sort === "filename_asc") {
      orderByClause = "m.original_filename ASC, m.id DESC";
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const baseQueryParams = [...joinAlbumParams, ...whereParams];

    // Count total items
    const countSql = `
      SELECT COUNT(DISTINCT m.id) as total
      FROM media m
      ${joinAlbumClause}
      ${whereSql}
    `;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, baseQueryParams);
    const totalCount = countRows[0]?.total ?? 0;

    // Fetch media with thumbnail variant if available
    const dataSql = `
      SELECT m.id, m.original_filename, m.storage_key, m.mime_type, m.file_size,
             m.media_type, m.duration_seconds, m.width, m.height, m.is_favorite,
             m.taken_at, m.uploaded_at,
             v.storage_key as thumbnail_storage_key
      FROM media m
      ${joinAlbumClause}
      LEFT JOIN media_variants v ON v.media_id = m.id AND v.variant_type = 'thumbnail'
      ${whereSql}
      ORDER BY ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const dataQueryParams = [...baseQueryParams, limit, offset];
    const [mediaItems] = await pool.query<RowDataPacket[]>(dataSql, dataQueryParams);

    return NextResponse.json({
      items: mediaItems,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Media list error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar media" },
      { status: 500 }
    );
  }
}
