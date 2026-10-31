import { pool } from "../db/connection";
import { RowDataPacket } from "mysql2";

export interface StorageStatus {
  quotaBytes: number;
  usedBytes: number;
  reservedBytes: number;
  freeBytes: number;
  percentageUsed: number;
  status: "normal" | "warning_80" | "critical_90" | "full_100";
}

/**
 * Fetch current storage usage, quota, and warning state
 */
export async function getStorageStatus(): Promise<StorageStatus> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT storage_quota_bytes, used_bytes, reserved_bytes FROM app_settings WHERE id = 1"
  );

  const quotaBytes = Number(rows[0]?.storage_quota_bytes ?? 50000000000);
  const usedBytes = Number(rows[0]?.used_bytes ?? 0);
  const reservedBytes = Number(rows[0]?.reserved_bytes ?? 0);

  const totalCommitted = usedBytes + reservedBytes;
  const freeBytes = Math.max(0, quotaBytes - totalCommitted);
  const percentageUsed = Math.min(100, (totalCommitted / quotaBytes) * 100);

  let status: StorageStatus["status"] = "normal";
  if (percentageUsed >= 100) {
    status = "full_100";
  } else if (percentageUsed >= 90) {
    status = "critical_90";
  } else if (percentageUsed >= 80) {
    status = "warning_80";
  }

  return {
    quotaBytes,
    usedBytes,
    reservedBytes,
    freeBytes,
    percentageUsed,
    status,
  };
}

/**
 * Atomically reserve storage bytes for an upcoming upload
 * Returns true if reservation succeeded, false if quota exceeded
 */
export async function reserveStorage(bytes: number): Promise<boolean> {
  if (bytes <= 0) return true;

  const [result] = await pool.query<RowDataPacket[] & { affectedRows: number }>(
    `UPDATE app_settings
     SET reserved_bytes = reserved_bytes + ?
     WHERE id = 1 AND (used_bytes + reserved_bytes + ?) <= storage_quota_bytes`,
    [bytes, bytes]
  );

  return result.affectedRows > 0;
}

/**
 * Release reserved bytes (e.g. on cancellation or failure)
 */
export async function releaseReservation(bytes: number): Promise<void> {
  if (bytes <= 0) return;
  await pool.query(
    `UPDATE app_settings
     SET reserved_bytes = GREATEST(0, CAST(reserved_bytes AS SIGNED) - ?)
     WHERE id = 1`,
    [bytes]
  );
}

/**
 * Commit finalized upload: subtract reservation and add to used_bytes
 */
export async function commitUploadBytes(
  reservedBytes: number,
  actualBytes: number
): Promise<void> {
  await pool.query(
    `UPDATE app_settings
     SET reserved_bytes = GREATEST(0, CAST(reserved_bytes AS SIGNED) - ?),
         used_bytes = used_bytes + ?
     WHERE id = 1`,
    [reservedBytes, actualBytes]
  );
}

/**
 * Subtract bytes from used_bytes on permanent deletion of media and variants
 */
export async function deductUsedBytes(bytes: number): Promise<void> {
  if (bytes <= 0) return;
  await pool.query(
    `UPDATE app_settings
     SET used_bytes = GREATEST(0, CAST(used_bytes AS SIGNED) - ?)
     WHERE id = 1`,
    [bytes]
  );
}
