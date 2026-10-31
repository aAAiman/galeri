import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/connection";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { enqueuePurgeJob } from "@/lib/worker/media-worker";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [items] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM media WHERE deleted_at IS NOT NULL AND purge_requested_at IS NULL"
    );

    for (const item of items) {
      await enqueuePurgeJob(item.id);
    }

    return NextResponse.json({
      success: true,
      message: `${items.length} media di Trash dijadwalkan untuk dikosongkan permanen`,
    });
  } catch (error) {
    console.error("Empty trash error:", error);
    return NextResponse.json(
      { error: "Gagal mengosongkan Trash" },
      { status: 500 }
    );
  }
}
