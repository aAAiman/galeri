import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import { pool } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { reserveStorage } from "@/lib/storage/quota";

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".mp4",
  ".mov",
  ".webm",
]);

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { filename, fileSize, targetAlbumId } = body;

    if (!filename || typeof fileSize !== "number" || fileSize <= 0) {
      return NextResponse.json(
        { error: "Nama file dan ukuran file yang valid wajib disertakan" },
        { status: 400 }
      );
    }

    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          error: `Format file ${ext} tidak didukung. Format yang diterima: JPG, PNG, WebP, GIF, MP4, MOV, WebM.`,
        },
        { status: 400 }
      );
    }

    // Attempt atomic storage reservation
    const hasSpace = await reserveStorage(fileSize);
    if (!hasSpace) {
      return NextResponse.json(
        {
          error: "Penyimpanan penuh atau kuota 50 GB terlampaui. Upload dibatalkan.",
        },
        { status: 413 }
      );
    }

    const uploadSessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    await pool.query(
      `INSERT INTO upload_sessions 
       (id, target_album_id, original_filename, expected_bytes, uploaded_bytes, status, reserved_bytes, expires_at)
       VALUES (?, ?, ?, ?, 0, 'pending', ?, ?)`,
      [
        uploadSessionId,
        targetAlbumId || null,
        filename,
        fileSize,
        fileSize,
        expiresAt,
      ]
    );

    return NextResponse.json({
      uploadSessionId,
      expiresAt: expiresAt.toISOString(),
      expectedBytes: fileSize,
    });
  } catch (error) {
    console.error("Upload init error:", error);
    return NextResponse.json(
      { error: "Gagal memulai sesi upload" },
      { status: 500 }
    );
  }
}
