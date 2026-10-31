import { NextRequest, NextResponse } from "next/server";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getStorageStatus } from "@/lib/storage/quota";

export async function GET(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getStorageStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Storage status error:", error);
    return NextResponse.json(
      { error: "Gagal membaca status penyimpanan" },
      { status: 500 }
    );
  }
}
