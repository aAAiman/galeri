import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/connection";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  validateSessionToken,
  invalidateAllSessions,
  createSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionToken(rawToken);

    if (!session.isValid) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau telah berakhir" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Password saat ini dan password baru wajib diisi" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password baru minimal 6 karakter" },
        { status: 400 }
      );
    }

    // Verify current password
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT password_hash FROM app_settings WHERE id = 1"
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Pengaturan belum ditemukan" },
        { status: 500 }
      );
    }

    const currentHash = rows[0].password_hash;
    const isCurrentValid = await verifyPassword(currentHash, currentPassword);

    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Password saat ini tidak cocok" },
        { status: 400 }
      );
    }

    // Hash new password with Argon2id
    const newHash = await hashPassword(newPassword);

    // Invalidate old sessions and update hash
    await invalidateAllSessions();
    await pool.query(
      "UPDATE app_settings SET password_hash = ? WHERE id = 1",
      [newHash]
    );

    // Issue a fresh session for the current user
    const { rawToken: newToken, expiresAt } = await createSession();

    const response = NextResponse.json({
      success: true,
      message: "Password berhasil diperbarui. Seluruh sesi lain telah dikeluarkan.",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: newToken,
      expires: expiresAt,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Gagal mengganti password" },
      { status: 500 }
    );
  }
}
