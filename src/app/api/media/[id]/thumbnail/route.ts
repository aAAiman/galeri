import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import fsPromises from "fs/promises";
import sharp from "sharp";
import { pool } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getOriginalPath, getVariantPath } from "@/lib/storage/filesystem";
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

    // Check if thumbnail variant exists
    const [variants] = await pool.query<RowDataPacket[]>(
      "SELECT storage_key, mime_type, file_size FROM media_variants WHERE media_id = ? AND variant_type IN ('thumbnail', 'poster') LIMIT 1",
      [mediaId]
    );

    if (variants.length > 0) {
      const vPath = getVariantPath(variants[0].storage_key);
      try {
        await fsPromises.access(vPath, fs.constants.R_OK);
        const stat = await fsPromises.stat(vPath);
        const stream = fs.createReadStream(vPath);
        return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
          status: 200,
          headers: {
            "Content-Type": variants[0].mime_type || "image/webp",
            "Content-Length": stat.size.toString(),
            "Cache-Control": "private, max-age=86400",
          },
        });
      } catch {
        // Fallback to original
      }
    }

    // Fallback: check original media
    const [mediaRows] = await pool.query<RowDataPacket[]>(
      "SELECT storage_key, media_type, mime_type FROM media WHERE id = ?",
      [mediaId]
    );

    if (!mediaRows || mediaRows.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const orig = mediaRows[0];
    const origPath = getOriginalPath(orig.storage_key);

    if (orig.media_type === "image") {
      try {
        // Generate on-the-fly thumbnail
        const thumbBuffer = await sharp(origPath)
          .rotate()
          .resize(320, 320, { fit: "cover", position: "centre" })
          .webp({ quality: 80 })
          .toBuffer();

        return new NextResponse(thumbBuffer, {
          status: 200,
          headers: {
            "Content-Type": "image/webp",
            "Content-Length": thumbBuffer.length.toString(),
            "Cache-Control": "private, max-age=86400",
          },
        });
      } catch {
        // If Sharp fails, fallback to direct original stream
        const stat = await fsPromises.stat(origPath);
        const stream = fs.createReadStream(origPath);
        return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
          status: 200,
          headers: {
            "Content-Type": orig.mime_type,
            "Content-Length": stat.size.toString(),
          },
        });
      }
    } else {
      // For video without poster yet, generate a fast SVG badge
      const svg = `
        <svg width="320" height="320" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#1e293b" />
          <circle cx="160" cy="160" r="36" fill="#38bdf8" />
          <polygon points="152,146 176,160 152,174" fill="#ffffff" />
        </svg>
      `;
      return new NextResponse(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "private, max-age=86400",
        },
      });
    }
  } catch (error) {
    console.error("Thumbnail error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
