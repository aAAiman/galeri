import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/connection";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  checkRateLimit,
  resetRateLimit,
  SESSION_COOKIE_NAME,
  SESSION_EXPIRY_DAYS,
} from "@/lib/auth/session";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan login. Coba lagi dalam ${rateCheck.retryAfterSeconds} detik.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password wajib diisi" },
        { status: 400 }
      );
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT password_hash FROM app_settings WHERE id = 1"
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Konfigurasi server belum diinisialisasi" },
        { status: 500 }
      );
    }

    const passwordHash = rows[0].password_hash;
    const isValid = await verifyPassword(passwordHash, password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Password salah. Silakan coba lagi." },
        { status: 401 }
      );
    }

    // Login success, reset rate limit
    resetRateLimit(ip);

    // Create session
    const { rawToken, expiresAt } = await createSession();

    const response = NextResponse.json({
      success: true,
      message: "Login berhasil",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: rawToken,
      expires: expiresAt,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server internal" },
      { status: 500 }
    );
  }
}
