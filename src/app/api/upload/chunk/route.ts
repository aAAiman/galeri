import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { appendChunkToTemp } from "@/lib/storage/filesystem";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uploadSessionId = request.headers.get("x-upload-id");
    const offsetStr = request.headers.get("x-upload-offset");

    if (!uploadSessionId) {
      return NextResponse.json(
        { error: "Header x-upload-id wajib diisi" },
        { status: 400 }
      );
    }

    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

    // Verify upload session in database
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, status, expected_bytes, uploaded_bytes, expires_at FROM upload_sessions WHERE id = ?",
      [uploadSessionId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Sesi upload tidak ditemukan" },
        { status: 404 }
      );
    }

    const uploadSession = rows[0];
    if (uploadSession.status === "completed") {
      return NextResponse.json(
        { message: "Upload telah selesai", uploadedBytes: uploadSession.uploaded_bytes },
        { status: 200 }
      );
    }

    const chunkArrayBuffer = await request.arrayBuffer();
    const chunkBuffer = Buffer.from(chunkArrayBuffer);

    if (chunkBuffer.length === 0) {
      return NextResponse.json({ error: "Chunk kosong" }, { status: 400 });
    }

    const totalWritten = await appendChunkToTemp(
      uploadSessionId,
      chunkBuffer,
      offset
    );

    await pool.query(
      "UPDATE upload_sessions SET uploaded_bytes = ?, status = 'uploading' WHERE id = ?",
      [totalWritten, uploadSessionId]
    );

    return NextResponse.json({
      uploadedBytes: totalWritten,
      expectedBytes: uploadSession.expected_bytes,
      isComplete: totalWritten >= uploadSession.expected_bytes,
    });
  } catch (error) {
    console.error("Upload chunk error:", error);
    return NextResponse.json(
      { error: "Gagal memproses chunk upload" },
      { status: 500 }
    );
  }
}
