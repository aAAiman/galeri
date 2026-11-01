import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";
import mime from "mime-types";
import sharp from "sharp";
import { pool, withTransaction } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  generateStorageKey,
  getOriginalPath,
  ensureStorageDirectories,
} from "@/lib/storage/filesystem";
import {
  reserveStorage,
  commitUploadBytes,
  releaseReservation,
} from "@/lib/storage/quota";
import { enqueueThumbnailJob } from "@/lib/worker/media-worker";
import { ResultSetHeader } from "mysql2";

export const dynamic = "force-dynamic";
export const maxDuration = 3600; // Allow up to 1 hour for large 1.5GB+ videos on home network

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".mp4",
  ".mov",
  ".webm",
  ".heic",
  ".mkv",
]);

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const targetAlbumIdStr = formData.get("targetAlbumId") as string | null;
    const targetAlbumId = targetAlbumIdStr ? parseInt(targetAlbumIdStr, 10) : null;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan dalam request" },
        { status: 400 }
      );
    }

    const originalFilename = file.name || "media_upload";
    const ext = path.extname(originalFilename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          error: `Format file ${ext} tidak didukung. Format yang diizinkan: JPG, PNG, WebP, GIF, MP4, MOV, WebM.`,
        },
        { status: 400 }
      );
    }

    const fileSize = file.size;

    // Check storage quota
    const hasSpace = await reserveStorage(fileSize);
    if (!hasSpace) {
      return NextResponse.json(
        { error: "Penyimpanan penuh atau kuota 50 GB terlampaui" },
        { status: 413 }
      );
    }

    await ensureStorageDirectories();
    const storageKey = generateStorageKey(originalFilename);
    const targetPath = getOriginalPath(storageKey);

    // Stream directly to disk in ~64KB chunks to prevent memory spikes & OOM crashes on 1.5GB+ files
    const nodeReadable = Readable.fromWeb(file.stream() as any);
    const writeStream = fs.createWriteStream(targetPath);
    await pipeline(nodeReadable, writeStream);

    // Commit quota reservation
    await commitUploadBytes(fileSize, fileSize);

    const mimeType =
      file.type || mime.lookup(originalFilename) || "application/octet-stream";
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
        const metadata = await sharp(targetPath).metadata();
        width = metadata.width || null;
        height = metadata.height || null;
      } catch (e) {
        console.warn("Could not read image dimensions:", e);
      }
    }

    const mediaId = await withTransaction(async (conn) => {
      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO media 
         (original_filename, storage_key, mime_type, file_size, media_type, width, height, is_favorite, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
        [
          originalFilename,
          storageKey,
          mimeType,
          fileSize,
          mediaType,
          width,
          height,
        ]
      );

      const insertedId = result.insertId;

      if (targetAlbumId) {
        await conn.query(
          `INSERT IGNORE INTO album_media (album_id, media_id, added_at)
           VALUES (?, ?, NOW())`,
          [targetAlbumId, insertedId]
        );
      }

      return insertedId;
    });

    await enqueueThumbnailJob(mediaId);

    return NextResponse.json({
      success: true,
      mediaId,
      mediaType,
      storageKey,
      fileSize,
      originalFilename,
    });
  } catch (error) {
    console.error("Direct upload error:", error);
    return NextResponse.json(
      { error: "Gagal memproses upload file" },
      { status: 500 }
    );
  }
}
