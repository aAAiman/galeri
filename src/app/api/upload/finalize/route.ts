import { NextRequest, NextResponse } from "next/server";
import mime from "mime-types";
import path from "path";
import sharp from "sharp";
import { pool, withTransaction } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  generateStorageKey,
  finalizeTempFile,
  getOriginalPath,
} from "@/lib/storage/filesystem";
import { commitUploadBytes, releaseReservation } from "@/lib/storage/quota";
import { enqueueThumbnailJob } from "@/lib/worker/media-worker";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { uploadSessionId } = body;

    if (!uploadSessionId) {
      return NextResponse.json(
        { error: "uploadSessionId wajib diisi" },
        { status: 400 }
      );
    }

    // Retrieve upload session
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, target_album_id, original_filename, expected_bytes, uploaded_bytes, status, reserved_bytes
       FROM upload_sessions WHERE id = ?`,
      [uploadSessionId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Sesi upload tidak ditemukan" },
        { status: 404 }
      );
    }

    const uploadSession = rows[0];

    // Idempotency: if already completed, return success
    if (uploadSession.status === "completed") {
      const [existingMedia] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM media WHERE original_filename = ? ORDER BY id DESC LIMIT 1",
        [uploadSession.original_filename]
      );
      return NextResponse.json({
        success: true,
        message: "File sudah difinalisasi sebelumnya",
        mediaId: existingMedia[0]?.id,
      });
    }

    const originalFilename = uploadSession.original_filename;
    const storageKey = generateStorageKey(originalFilename);

    // Finalize file on filesystem
    const { size: actualSize, path: finalPath } = await finalizeTempFile(
      uploadSessionId,
      storageKey
    );

    // Commit quota reservation
    await commitUploadBytes(uploadSession.reserved_bytes, actualSize);

    // Detect MIME and media type
    const mimeType =
      mime.lookup(originalFilename) || "application/octet-stream";
    const isVideo =
      mimeType.startsWith("video/") ||
      [".mp4", ".mov", ".webm"].includes(
        path.extname(originalFilename).toLowerCase()
      );
    const mediaType: "image" | "video" = isVideo ? "video" : "image";

    let width: number | null = null;
    let height: number | null = null;

    if (mediaType === "image") {
      try {
        const metadata = await sharp(finalPath).metadata();
        width = metadata.width || null;
        height = metadata.height || null;
      } catch (err) {
        console.warn("Failed to extract image metadata via Sharp:", err);
      }
    }

    // Insert into media and optionally album_media in a transaction
    const mediaId = await withTransaction(async (conn) => {
      const [mediaResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO media 
         (original_filename, storage_key, mime_type, file_size, media_type, width, height, is_favorite, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
        [
          originalFilename,
          storageKey,
          mimeType,
          actualSize,
          mediaType,
          width,
          height,
        ]
      );

      const insertedMediaId = mediaResult.insertId;

      if (uploadSession.target_album_id) {
        await conn.query(
          `INSERT IGNORE INTO album_media (album_id, media_id, added_at)
           VALUES (?, ?, NOW())`,
          [uploadSession.target_album_id, insertedMediaId]
        );
      }

      await conn.query(
        "UPDATE upload_sessions SET status = 'completed' WHERE id = ?",
        [uploadSessionId]
      );

      return insertedMediaId;
    });

    // Enqueue background thumbnail and preview generation
    await enqueueThumbnailJob(mediaId);

    return NextResponse.json({
      success: true,
      mediaId,
      mediaType,
      storageKey,
      fileSize: actualSize,
    });
  } catch (error) {
    console.error("Upload finalize error:", error);
    return NextResponse.json(
      { error: "Gagal memfinalisasi file upload" },
      { status: 500 }
    );
  }
}
