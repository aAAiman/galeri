import { NextRequest, NextResponse } from "next/server";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { runJobQueueWorker } from "@/lib/worker/media-worker";

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const processed = await runJobQueueWorker();

    return NextResponse.json({
      success: true,
      processedCount: processed,
    });
  } catch (error) {
    console.error("Worker process route error:", error);
    return NextResponse.json(
      { error: "Gagal menjalankan background worker" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
