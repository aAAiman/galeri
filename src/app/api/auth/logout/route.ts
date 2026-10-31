import { NextRequest, NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (rawToken) {
      await destroySession(rawToken);
    }

    const response = NextResponse.json({
      success: true,
      message: "Logout berhasil",
    });

    response.cookies.delete({
      name: SESSION_COOKIE_NAME,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout route error:", error);
    return NextResponse.json(
      { error: "Gagal memproses logout" },
      { status: 500 }
    );
  }
}
