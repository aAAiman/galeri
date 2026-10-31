import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import fsPromises from "fs/promises";
import { pool } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getOriginalPath } from "@/lib/storage/filesystem";
import { RowDataPacket } from "mysql2";
import { Readable } from "stream";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: idStr } = await context.params;
    const mediaId = parseInt(idStr, 10);

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT storage_key, mime_type, file_size, original_filename FROM media WHERE id = ? AND deleted_at IS NULL",
      [mediaId]
    );

    if (!rows || rows.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const item = rows[0];
    const filePath = getOriginalPath(item.storage_key);

    try {
      await fsPromises.access(filePath, fs.constants.R_OK);
    } catch {
      return new NextResponse("File missing on disk", { status: 404 });
    }

    const stat = await fsPromises.stat(filePath);
    const fileSize = stat.size;
    const range = request.headers.get("range");

    // Handle HTTP Range Requests for video/audio streaming and smooth seeking
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new NextResponse("Requested range not satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      const webStream = Readable.toWeb(fileStream) as ReadableStream;

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": item.mime_type || "application/octet-stream",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // Full file stream
    const fileStream = fs.createReadStream(filePath);
    const webStream = Readable.toWeb(fileStream) as ReadableStream;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": item.mime_type || "application/octet-stream",
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Stream file error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
