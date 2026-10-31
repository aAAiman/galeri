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
      "SELECT storage_key, mime_type, file_size, original_filename FROM media WHERE id = ?",
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
    const fileStream = fs.createReadStream(filePath);
    const webStream = Readable.toWeb(fileStream) as ReadableStream;

    const safeFilename = encodeURIComponent(item.original_filename);

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Length": stat.size.toString(),
        "Content-Type": item.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${item.original_filename}"; filename*=UTF-8''${safeFilename}`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error("Download file error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
