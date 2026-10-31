import { NextRequest, NextResponse } from "next/server";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { enqueuePurgeJob } from "@/lib/worker/media-worker";

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { mediaIds } = body;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json(
        { error: "mediaIds array wajib disertakan" },
        { status: 400 }
      );
    }

    for (const mId of mediaIds) {
      await enqueuePurgeJob(mId);
    }

    return NextResponse.json({
      success: true,
      message: `${mediaIds.length} media dijadwalkan untuk penghapusan permanen`,
    });
  } catch (error) {
    console.error("Permanent delete error:", error);
    return NextResponse.json(
      { error: "Gagal memproses penghapusan permanen" },
      { status: 500 }
    );
  }
}
