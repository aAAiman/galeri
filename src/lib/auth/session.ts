import crypto from "crypto";
import { cookies } from "next/headers";
import { pool } from "../db/connection";
import { RowDataPacket } from "mysql2";

export const SESSION_COOKIE_NAME = "galerikita_session";
export const SESSION_EXPIRY_DAYS = 30;

// Simple in-memory rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 mins window
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.count >= 5) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  record.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

/**
 * Generate SHA-256 hash of the raw session token
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Create a new authenticated session in database
 */
export async function createSession(): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const sessionId = crypto.randomUUID();

  // Get current app session_version
  const [settings] = await pool.query<RowDataPacket[]>(
    "SELECT session_version FROM app_settings WHERE id = 1"
  );
  const currentVersion = settings[0]?.session_version ?? 1;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  await pool.query(
    `INSERT INTO sessions (id, token_hash, session_version, expires_at)
     VALUES (?, ?, ?, ?)`,
    [sessionId, tokenHash, currentVersion, expiresAt]
  );

  return { rawToken, expiresAt };
}

/**
 * Invalidate a single session by its raw token
 */
export async function destroySession(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await pool.query("DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
}

/**
 * Invalidate all sessions globally by incrementing app_settings.session_version
 */
export async function invalidateAllSessions(): Promise<number> {
  await pool.query(
    "UPDATE app_settings SET session_version = session_version + 1 WHERE id = 1"
  );
  const [settings] = await pool.query<RowDataPacket[]>(
    "SELECT session_version FROM app_settings WHERE id = 1"
  );
  return settings[0]?.session_version ?? 1;
}

/**
 * Validate session token against database and active session_version
 */
export async function validateSessionToken(
  rawToken: string | undefined | null
): Promise<{ isValid: boolean; sessionId?: string }> {
  if (!rawToken || typeof rawToken !== "string") {
    return { isValid: false };
  }

  const tokenHash = hashToken(rawToken);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.session_version, s.expires_at, a.session_version AS current_version
     FROM sessions s
     CROSS JOIN app_settings a ON a.id = 1
     WHERE s.token_hash = ? AND s.expires_at > NOW()`,
    [tokenHash]
  );

  if (!rows || rows.length === 0) {
    return { isValid: false };
  }

  const session = rows[0];
  if (session.session_version !== session.current_version) {
    // Session is obsolete due to password change, delete it
    await pool.query("DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
    return { isValid: false };
  }

  return { isValid: true, sessionId: session.id };
}

/**
 * Helper to get and validate session in Server Components and Route Handlers
 */
export async function getAuthenticatedSession(): Promise<{ isValid: boolean; sessionId?: string }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return { isValid: false };
  }
  return await validateSessionToken(sessionCookie.value);
}
