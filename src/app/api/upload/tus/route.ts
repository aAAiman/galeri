import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import { pool } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { reserveStorage } from "@/lib/storage/quota";
import { ensureStorageDirectories } from "@/lib/storage/filesystem";

export const dynamic = "force-dynamic";

const TUS_RESUMABLE = "1.0.0";
const TUS_VERSION = "1.0.0";
const TUS_EXTENSIONS = "creation,termination";
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024 * 1024; // 50 GB

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".mp4",
  ".mov",
  ".webm",
  ".mkv",
  ".heic",
]);

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

function parseUploadMetadata(metadataHeader: string | null): Record<string, string> {
  if (!metadataHeader) return {};
  const metadata: Record<string, string> = {};
  const pairs = metadataHeader.split(",");
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    const key = parts[0];
    const encodedValue = parts[1];
    if (key) {
      metadata[key] = encodedValue
        ? Buffer.from(encodedValue, "base64").toString("utf-8")
        : "";
    }
  }
  return metadata;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getTusHeaders(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: getTusHeaders({ "Content-Type": "application/json" }),
      });
    }

    const uploadLengthHeader = request.headers.get("upload-length");
    if (!uploadLengthHeader) {
      return new NextResponse(
        JSON.stringify({ error: "Header Upload-Length wajib disertakan" }),
        {
          status: 400,
          headers: getTusHeaders({ "Content-Type": "application/json" }),
        }
      );
    }

    const uploadLength = parseInt(uploadLengthHeader, 10);
    if (isNaN(uploadLength) || uploadLength < 0) {
      return new NextResponse(
        JSON.stringify({ error: "Upload-Length tidak valid" }),
        {
          status: 400,
          headers: getTusHeaders({ "Content-Type": "application/json" }),
        }
      );
    }

    if (uploadLength > MAX_UPLOAD_SIZE) {
      return new NextResponse(
        JSON.stringify({ error: "Ukuran file melebihi batas 50 GB" }),
        {
          status: 413,
          headers: getTusHeaders({ "Content-Type": "application/json" }),
        }
      );
    }

    // Parse Upload-Metadata
    const metadataHeader = request.headers.get("upload-metadata");
    const metadata = parseUploadMetadata(metadataHeader);

    const filename = metadata.filename || metadata.name || "media_upload";
    const targetAlbumIdStr = metadata.targetAlbumId || metadata.target_album_id;
    const targetAlbumId = targetAlbumIdStr ? parseInt(targetAlbumIdStr, 10) : null;

    const ext = path.extname(filename).toLowerCase();
    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
      return new NextResponse(
        JSON.stringify({
          error: `Format file ${ext} tidak didukung. Format yang didukung: JPG, PNG, WebP, GIF, MP4, MOV, WebM, MKV, HEIC.`,
        }),
        {
          status: 400,
          headers: getTusHeaders({ "Content-Type": "application/json" }),
        }
      );
    }

    // Storage reservation
    const hasSpace = await reserveStorage(uploadLength);
    if (!hasSpace) {
      return new NextResponse(
        JSON.stringify({
          error: "Penyimpanan penuh atau kuota 50 GB terlampaui. Upload dibatalkan.",
        }),
        {
          status: 413,
          headers: getTusHeaders({ "Content-Type": "application/json" }),
        }
      );
    }

    await ensureStorageDirectories();

    const uploadSessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h expiry

    await pool.query(
      `INSERT INTO upload_sessions 
       (id, tus_upload_id, target_album_id, original_filename, expected_bytes, uploaded_bytes, status, reserved_bytes, expires_at)
       VALUES (?, ?, ?, ?, ?, 0, 'pending', ?, ?)`,
      [
        uploadSessionId,
        uploadSessionId,
        targetAlbumId || null,
        filename,
        uploadLength,
        uploadLength,
        expiresAt,
      ]
    );

    // Tus Creation response
    return new NextResponse(null, {
      status: 201,
      headers: getTusHeaders({
        Location: `/api/upload/tus/${uploadSessionId}`,
      }),
    });
  } catch (error) {
    console.error("TUS POST error:", error);
    return new NextResponse(
      JSON.stringify({ error: "Gagal menginisialisasi sesi upload TUS" }),
      {
        status: 500,
        headers: getTusHeaders({ "Content-Type": "application/json" }),
      }
    );
  }
}
