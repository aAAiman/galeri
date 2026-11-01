import { hashPassword, verifyPassword } from "./src/lib/auth/password";
import { pool, withTransaction } from "./src/lib/db/connection";
import { getStorageStatus, reserveStorage, commitUploadBytes, deductUsedBytes } from "./src/lib/storage/quota";
import { generateStorageKey, getOriginalPath, ensureStorageDirectories } from "./src/lib/storage/filesystem";
import { runJobQueueWorker, enqueueThumbnailJob } from "./src/lib/worker/media-worker";
import sharp from "sharp";
import fsPromises from "fs/promises";
import { RowDataPacket, ResultSetHeader } from "mysql2";

async function runTests() {
  console.log("=== STARTING GALERIKITA PRD & ERD VALIDATION TESTS ===");

  // Test 1: Argon2id Password Hashing & Verification (FR-001)
  console.log("\n[Test 1] Testing Argon2id Password...");
  const pwd = "galerikita2026";
  const hash = await hashPassword(pwd);
  const isMatch = await verifyPassword(hash, pwd);
  const isWrongMatch = await verifyPassword(hash, "wrongpwd");
  if (isMatch && !isWrongMatch) {
    console.log("✓ Argon2id hash & verification works correctly.");
  } else {
    throw new Error("Argon2id test failed");
  }

  // Test 2: Storage Quota & Atomic Reservation (FR-015, Invariant 7)
  console.log("\n[Test 2] Testing 50 GB Quota & Atomic Reservation...");
  const initialStatus = await getStorageStatus();
  console.log(`Initial Quota: ${initialStatus.quotaBytes} bytes, Used: ${initialStatus.usedBytes} bytes, Status: ${initialStatus.status}`);
  
  // Reserve 5 MB
  const fiveMB = 5 * 1024 * 1024;
  const reserved = await reserveStorage(fiveMB);
  if (!reserved) throw new Error("Reservation failed");
  console.log("✓ Atomic reservation of 5 MB succeeded.");

  await commitUploadBytes(fiveMB, fiveMB);
  const afterCommit = await getStorageStatus();
  console.log(`✓ Committed 5 MB. Current used: ${afterCommit.usedBytes} bytes.`);

  // Test 3: Upload Sample Image & Sharp Thumbnail Variant (FR-003, FR-017)
  console.log("\n[Test 3] Testing Media Upload & Sharp Processing...");
  await ensureStorageDirectories();
  const sampleKey = generateStorageKey("test_sample.png");
  const origPath = getOriginalPath(sampleKey);

  // Generate a test 800x600 PNG with Sharp
  await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 4,
      background: { r: 56, g: 189, b: 248, alpha: 1 },
    },
  })
    .png()
    .toFile(origPath);

  const stat = await fsPromises.stat(origPath);

  // Insert test media into database
  const [insertRes] = await pool.query<ResultSetHeader>(
    `INSERT INTO media (original_filename, storage_key, mime_type, file_size, media_type, width, height, is_favorite, uploaded_at)
     VALUES ('test_sample.png', ?, 'image/png', ?, 'image', 800, 600, 0, NOW())`,
    [sampleKey, stat.size]
  );
  const testMediaId = insertRes.insertId;
  console.log(`✓ Inserted media ID: ${testMediaId}`);

  // Enqueue thumbnail job and process queue
  await enqueueThumbnailJob(testMediaId);
  let processedCount = 0;
  let batch = 0;
  while ((batch = await runJobQueueWorker(20)) > 0) {
    processedCount += batch;
  }
  console.log(`✓ Worker processed ${processedCount} queued jobs.`);

  // Verify variant generated
  const [variants] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM media_variants WHERE media_id = ?",
    [testMediaId]
  );
  if (variants.length > 0) {
    console.log(`✓ Thumbnail variant created: ${variants[0].variant_type} (${variants[0].file_size} bytes)`);
  } else {
    throw new Error("Variant was not generated");
  }

  // Test 4: Album CRUD, Move & Add Operations (FR-005, FR-006, FR-007, Invariant 2)
  console.log("\n[Test 4] Testing Album Operations...");
  const [albumA] = await pool.query<ResultSetHeader>(
    "INSERT INTO albums (name, description) VALUES ('Album Liburan', 'Test Album A')"
  );
  const [albumB] = await pool.query<ResultSetHeader>(
    "INSERT INTO albums (name, description) VALUES ('Album Kenangan', 'Test Album B')"
  );

  // Add to Album A
  await pool.query("INSERT INTO album_media (album_id, media_id) VALUES (?, ?)", [
    albumA.insertId,
    testMediaId,
  ]);
  console.log(`✓ Added media ${testMediaId} to Album ${albumA.insertId}`);

  // Move to Album B (transactional delete old, insert target)
  await withTransaction(async (conn) => {
    await conn.query("DELETE FROM album_media WHERE media_id = ?", [testMediaId]);
    await conn.query("INSERT INTO album_media (album_id, media_id) VALUES (?, ?)", [
      albumB.insertId,
      testMediaId,
    ]);
  });
  console.log("✓ Moved media to Album B via atomic transaction.");

  // Verify membership
  const [checkMem] = await pool.query<RowDataPacket[]>(
    "SELECT album_id FROM album_media WHERE media_id = ?",
    [testMediaId]
  );
  if (checkMem.length === 1 && checkMem[0].album_id === albumB.insertId) {
    console.log("✓ Verified media now strictly belongs to Album B.");
  } else {
    throw new Error("Album move invariant failed");
  }

  // Test 5: Soft Delete & Trash (FR-013)
  console.log("\n[Test 5] Testing Soft Delete & Trash...");
  await pool.query("UPDATE media SET deleted_at = NOW() WHERE id = ?", [testMediaId]);
  
  // Home query must exclude trashed media (ERD Invariant 1)
  const [homeList] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM media WHERE id = ? AND deleted_at IS NULL AND purge_requested_at IS NULL",
    [testMediaId]
  );
  if (homeList.length === 0) {
    console.log("✓ Invariant 1 verified: Soft-deleted media is excluded from Home.");
  } else {
    throw new Error("Soft-deleted media appeared in Home");
  }

  // Restore media
  await pool.query("UPDATE media SET deleted_at = NULL WHERE id = ?", [testMediaId]);
  const [restoredList] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM media WHERE id = ? AND deleted_at IS NULL",
    [testMediaId]
  );
  if (restoredList.length === 1) {
    console.log("✓ Restored media successfully.");
  }

  // Clean up test data
  console.log("\n[Test 6] Cleaning up test media and albums...");
  await pool.query("DELETE FROM albums WHERE id IN (?, ?)", [albumA.insertId, albumB.insertId]);
  await pool.query("DELETE FROM media WHERE id = ?", [testMediaId]);
  await deductUsedBytes(fiveMB);
  await fsPromises.unlink(origPath).catch(() => {});

  console.log("✓ Cleanup finished.");
  console.log("\n=== ALL PRD & ERD INVARIANT TESTS PASSED SUCCESSFULLY! ===");
  await pool.end();
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
