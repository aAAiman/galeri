import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import mime from "mime-types";
import sharp from "sharp";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool, withTransaction } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  ensureStorageDirectories,
  getTempPath,
  generateStorageKey,
  finalizeTempFile,
  safeDeleteFile,
} from "@/lib/storage/filesystem";
import { commitUploadBytes, releaseReservation } from "@/lib/storage/quota";
import { enqueueThumbnailJob } from "@/lib/worker/media-worker";

export const dynamic = "force-dynamic";

const TUS_RESUMABLE = "1.0.0";
const TUS_VERSION = "1.0.0";
const TUS_EXTENSIONS = "creation,termination";
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024 * 1024; // 50 GB

function getTusHeaders(extra: Record<string, string> = {}): HeadersInit {
  return {
    "Tus-Resumable": TUS_RESUMABLE,
    "Tus-Version": TUS_VERSION,
    "Tus-Extension": TUS_EXTENSIONS,
    "Tus-Max-Size": MAX_UPLOAD_SIZE.toString(),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, HEAD, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Upload-Length, Upload-Offset, Upload-Metadata, Tus-Resumable, Content-Type, Authorization, x-requested-with",
    "Access-Control-Expose-Headers":
      "Upload-Offset, Location, Upload-Length, Tus-Version, Tus-Resumable, Tus-Max-Size, Tus-Extension",
    ...extra,
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getTusHeaders(),
  });
}

export async function HEAD(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return new NextResponse(null, { status: 401, headers: getTusHeaders() });
    }

    const { id } = await props.params;
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, status, expected_bytes, uploaded_bytes FROM upload_sessions WHERE id = ? OR tus_upload_id = ?",
      [id, id]
    );

    if (!rows || rows.length === 0) {
      return new NextResponse(null, { status: 404, headers: getTusHeaders() });
    }

    const uploadSession = rows[0];

    // If session was cancelled or failed, return 404 so TUS client purges localStorage and starts clean
    if (uploadSession.status === "cancelled" || uploadSession.status === "failed") {
      return new NextResponse(null, { status: 404, headers: getTusHeaders() });
    }

    if (uploadSession.status === "completed") {
      return new NextResponse(null, {
        status: 200,
        headers: getTusHeaders({
          "Upload-Offset": uploadSession.expected_bytes.toString(),
          "Upload-Length": uploadSession.expected_bytes.toString(),
          "Cache-Control": "no-store",
        }),
      });
    }

    const tempPath = getTempPath(uploadSession.id);
    let currentOffset = 0;
    try {
      const stat = await fsPromises.stat(tempPath);
      currentOffset = stat.size;
    } catch {
      currentOffset = 0;
    }

    return new NextResponse(null, {
      status: 200,
      headers: getTusHeaders({
        "Upload-Offset": currentOffset.toString(),
        "Upload-Length": uploadSession.expected_bytes.toString(),
        "Cache-Control": "no-store",
      }),
    });
  } catch (error) {
    console.error("TUS HEAD error:", error);
    return new NextResponse(null, { status: 500, headers: getTusHeaders() });
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return new NextResponse(null, { status: 401, headers: getTusHeaders() });
    }

    const { id } = await props.params;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, target_album_id, original_filename, expected_bytes, uploaded_bytes, status, reserved_bytes 
       FROM upload_sessions WHERE id = ? OR tus_upload_id = ?`,
      [id, id]
    );

    if (!rows || rows.length === 0) {
      return new NextResponse(null, { status: 404, headers: getTusHeaders() });
    }

    const uploadSession = rows[0];
    const uploadSessionId = uploadSession.id;

    if (uploadSession.status === "cancelled" || uploadSession.status === "failed") {
      return new NextResponse(null, { status: 404, headers: getTusHeaders() });
    }

    if (uploadSession.status === "completed") {
      return new NextResponse(null, {
        status: 204,
        headers: getTusHeaders({
          "Upload-Offset": uploadSession.expected_bytes.toString(),
        }),
      });
    }

    const offsetHeader = request.headers.get("upload-offset");
    if (offsetHeader === null) {
      return new NextResponse("Header Upload-Offset missing", {
        status: 400,
        headers: getTusHeaders(),
      });
    }

    const clientOffset = parseInt(offsetHeader, 10);
      if (isNaN(clientOffset) || clientOffset < 0) {
        return new NextResponse("Invalid Upload-Offset", {
          status: 400,
          headers: getTusHeaders(),
        });
      }

      const tempPath = getTempPath(uploadSessionId);
      let diskSize = 0;
      try {
        const stat = await fsPromises.stat(tempPath);
        diskSize = stat.size;
      } catch {
        diskSize = 0;
      }

        // Auto-recovery from partial chunk failures:
        // If clientOffset < diskSize (client is retrying a chunk that was partially written before),
        // truncate file back to clientOffset so we avoid a 409 Conflict deadlock and allow a clean rewrite!
        if (clientOffset < diskSize) {
          await fsPromises.truncate(tempPath, clientOffset);
          diskSize = clientOffset;
        } else if (clientOffset > diskSize) {
          // Tus spec: offset mismatch when client tries to upload ahead of server's current offset
          return new NextResponse("Offset mismatch", {
            status: 409,
            headers: getTusHeaders({
              "Upload-Offset": diskSize.toString(),
            }),
          });
        }

        await ensureStorageDirectories();

        // Read chunk buffer safely and atomically
        const chunkArrayBuffer = await request.arrayBuffer();
        const chunkBuffer = Buffer.from(chunkArrayBuffer);

        if (chunkBuffer.length > 0) {
          const handle = await fsPromises.open(
            tempPath,
            clientOffset === 0
              ? fs.constants.O_CREAT | fs.constants.O_RDWR | fs.constants.O_TRUNC
              : fs.constants.O_CREAT | fs.constants.O_RDWR
          );
          try {
            await handle.write(chunkBuffer, 0, chunkBuffer.length, clientOffset);
          } finally {
            await handle.close();
          }
        }

        const newOffset = clientOffset + chunkBuffer.length;
        try {
          await fsPromises.truncate(tempPath, newOffset);
        } catch {
          // ignore
        }

        await pool.query(
          "UPDATE upload_sessions SET uploaded_bytes = ?, status = 'uploading' WHERE id = ?",
          [newOffset, uploadSessionId]
        );

        // If file is completely received, finalize atomically
        if (newOffset >= uploadSession.expected_bytes) {
          const originalFilename = uploadSession.original_filename;
          const storageKey = generateStorageKey(originalFilename);

          const { size: actualSize, path: finalPath } = await finalizeTempFile(
            uploadSessionId,
            storageKey
          );

          await commitUploadBytes(uploadSession.reserved_bytes, actualSize);

          const mimeType =
            mime.lookup(originalFilename) || "application/octet-stream";
          const isVideo =
            mimeType.startsWith("video/") ||
            [".mp4", ".mov", ".webm", ".mkv"].includes(
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
              console.warn("Sharp image metadata extraction skipped:", err);
            }
          }

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
              "UPDATE upload_sessions SET status = 'completed', uploaded_bytes = ? WHERE id = ?",
              [actualSize, uploadSessionId]
            );

            return insertedMediaId;
          });

          // Background thumbnail and preview generation
          await enqueueThumbnailJob(mediaId);
        }

        return new NextResponse(null, {
          status: 204,
          headers: getTusHeaders({
            "Upload-Offset": newOffset.toString(),
          }),
        });
      } catch (error) {
        console.error("TUS PATCH error:", error);
        return new NextResponse(null, { status: 500, headers: getTusHeaders() });
      }
    }

    export async function DELETE(
      request: NextRequest,
      props: { params: Promise<{ id: string }> }
    ) {
      try {
        const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
        const session = await validateSessionToken(rawToken);

        if (!session.isValid) {
          return new NextResponse(null, { status: 401, headers: getTusHeaders() });
        }

        const { id } = await props.params;
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT id, status, reserved_bytes FROM upload_sessions WHERE id = ? OR tus_upload_id = ?`,
          [id, id]
        );

        if (rows && rows.length > 0) {
          const uploadSession = rows[0];
          if (uploadSession.status !== "completed") {
            await releaseReservation(uploadSession.reserved_bytes);
            await safeDeleteFile(getTempPath(uploadSession.id));
            await pool.query(
              "UPDATE upload_sessions SET status = 'cancelled', reserved_bytes = 0 WHERE id = ?",
              [uploadSession.id]
            );
          }
        }

        return new NextResponse(null, {
          status: 204,
          headers: getTusHeaders(),
        });
      } catch (error) {
        console.error("TUS DELETE error:", error);
        return new NextResponse(null, { status: 500, headers: getTusHeaders() });
      }
    }
