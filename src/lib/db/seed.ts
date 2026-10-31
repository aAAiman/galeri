import { pool } from "./connection";
import { hashPassword } from "../auth/password";

async function seed() {
  console.log("Seeding GaleriKita database...");
  const defaultPassword = process.env.DEFAULT_PASSWORD || "galerikita2026";
  const passwordHash = await hashPassword(defaultPassword);

  const [rows] = await pool.query(
    "SELECT id FROM app_settings WHERE id = 1"
  );

  if (Array.isArray(rows) && rows.length > 0) {
    console.log("app_settings already seeded.");
  } else {
    await pool.query(
      `INSERT INTO app_settings (id, password_hash, session_version, storage_quota_bytes, used_bytes, reserved_bytes, trash_retention_days)
       VALUES (1, ?, 1, 50000000000, 0, 0, 30)`,
      [passwordHash]
    );
    console.log("Seeded app_settings with Argon2id hash for default password.");
  }

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
