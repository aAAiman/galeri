import path from "path";
import fsPromises from "fs/promises";
import sharp from "sharp";
import { pool } from "../db/connection";
import {
  getOriginalPath,
  getVariantPath,
  safeDeleteFile,
  STORAGE_PATHS,
} from "../storage/filesystem";
import { deductUsedBytes } from "../storage/quota";
import { RowDataPacket } from "mysql2";

let isWorkerBusy = false;

interface JobRow extends RowDataPacket {
  id: number;
  media_id: number;
  job_type: "thumbnail" | "video_poster" | "metadata" | "purge";
  attempts: number;
  max_attempts: number;
  original_filename: string;
  storage_key: string;
  media_type: "image" | "video";
}

/**
 * Process a single thumbnail job using Sharp
 */
async function processThumbnailJob(job: JobRow): Promise<void> {
  const originalPath = getOriginalPath(job.storage_key);

  if (job.media_type === "image") {
    // 1. Read metadata from original image
    const image = sharp(originalPath);
    const metadata = await image.metadata();

    const width = metadata.width || null;
    const height = metadata.height || null;
    let takenAt: Date | null = null;

    if (metadata.exif) {
      try {
        const exifData = (await sharp(originalPath).metadata()).exif;
        // Basic EXIF date parsing if present
      } catch (e) {
        // Ignore exif parse error
      }
    }

    // Update dimensions on media table
    await pool.query(
      "UPDATE media SET width = COALESCE(width, ?), height = COALESCE(height, ?) WHERE id = ?",
      [width, height, job.media_id]
    );

    // 2. Generate 320x320 thumbnail
    const thumbFilename = `thumb_${path.parse(job.storage_key).name}.webp`;
    const thumbPath = getVariantPath(thumbFilename);

    await sharp(originalPath)
      .rotate() // auto-orient based on EXIF
      .resize(320, 320, { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toFile(thumbPath);

    const thumbStat = await fsPromises.stat(thumbPath);

    // Insert or update thumbnail variant
    await pool.query(
      `INSERT INTO media_variants (media_id, variant_type, storage_key, mime_type, file_size, width, height)
       VALUES (?, 'thumbnail', ?, 'image/webp', ?, 320, 320)
       ON DUPLICATE KEY UPDATE file_size = VALUES(file_size)`,
      [job.media_id, thumbFilename, thumbStat.size]
    );

    // 3. Generate 1440px preview for fast fullscreen view
    const previewFilename = `preview_${path.parse(job.storage_key).name}.webp`;
    const previewPath = getVariantPath(previewFilename);

    await sharp(originalPath)
      .rotate()
      .resize(1440, 1440, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(previewPath);

    const previewStat = await fsPromises.stat(previewPath);

    await pool.query(
      `INSERT INTO media_variants (media_id, variant_type, storage_key, mime_type, file_size, width, height)
       VALUES (?, 'preview', ?, 'image/webp', ?, ?, ?)
       ON DUPLICATE KEY UPDATE file_size = VALUES(file_size)`,
      [job.media_id, previewFilename, previewStat.size, width, height]
    );
  } else if (job.media_type === "video") {
    // For video, generate an SVG / placeholder poster if ffmpeg is not available
    const posterFilename = `poster_${path.parse(job.storage_key).name}.webp`;
    const posterPath = getVariantPath(posterFilename);

    // Create a sleek dark gradient video poster with play badge
    const svgPoster = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
        <circle cx="200" cy="150" r="32" fill="#38bdf8" fill-opacity="0.9" />
        <polygon points="192,136 216,150 192,164" fill="#ffffff" />
      </svg>
    `;

    await sharp(Buffer.from(svgPoster))
      .resize(400, 300)
      .webp({ quality: 80 })
      .toFile(posterPath);

    const posterStat = await fsPromises.stat(posterPath);

    await pool.query(
      `INSERT INTO media_variants (media_id, variant_type, storage_key, mime_type, file_size, width, height)
       VALUES (?, 'poster', ?, 'image/webp', ?, 400, 300)
       ON DUPLICATE KEY UPDATE file_size = VALUES(file_size)`,
      [job.media_id, posterFilename, posterStat.size]
    );
  }
}

/**
 * Process a purge / permanent delete job
 */
async function processPurgeJob(job: JobRow): Promise<void> {
  // 1. Get media info and all variants
  const [variants] = await pool.query<RowDataPacket[]>(
    "SELECT storage_key, file_size FROM media_variants WHERE media_id = ?",
    [job.media_id]
  );

  const [mediaRows] = await pool.query<RowDataPacket[]>(
    "SELECT storage_key, file_size FROM media WHERE id = ?",
    [job.media_id]
  );

  let totalBytesFreed = 0;

  // Delete variant files
  for (const v of variants) {
    const vPath = getVariantPath(v.storage_key);
    await safeDeleteFile(vPath);
    totalBytesFreed += Number(v.file_size || 0);
  }

  // Delete original file
  if (mediaRows.length > 0) {
    const origPath = getOriginalPath(mediaRows[0].storage_key);
    await safeDeleteFile(origPath);
    totalBytesFreed += Number(mediaRows[0].file_size || 0);
  }

  // Deduct from used_bytes
  await deductUsedBytes(totalBytesFreed);

  // Delete media row (cascades variants, memberships, jobs)
  await pool.query("DELETE FROM media WHERE id = ?", [job.media_id]);
}

/**
 * Poll and process the queue of jobs
 */
export async function runJobQueueWorker(batchSize = 5): Promise<number> {
  if (isWorkerBusy) return 0;
  isWorkerBusy = true;

  let processedCount = 0;

  try {
    const [jobs] = await pool.query<JobRow[]>(
      `SELECT j.id, j.media_id, j.job_type, j.attempts, j.max_attempts,
              m.original_filename, m.storage_key, m.media_type
       FROM processing_jobs j
       LEFT JOIN media m ON m.id = j.media_id
       WHERE j.status = 'queued' AND j.scheduled_at <= NOW()
       ORDER BY j.id ASC
       LIMIT ?`,
      [batchSize]
    );

    for (const job of jobs) {
      // Mark as processing
      await pool.query(
        "UPDATE processing_jobs SET status = 'processing', attempts = attempts + 1 WHERE id = ?",
        [job.id]
      );

      try {
        if (job.job_type === "thumbnail" || job.job_type === "metadata") {
          await processThumbnailJob(job);
        } else if (job.job_type === "purge") {
          await processPurgeJob(job);
        }

        // Mark completed
        await pool.query(
          "UPDATE processing_jobs SET status = 'completed', completed_at = NOW() WHERE id = ?",
          [job.id]
        );
        processedCount++;
      } catch (jobErr: unknown) {
        console.error(`Error processing job ${job.id}:`, jobErr);
        const errMessage = jobErr instanceof Error ? jobErr.message : String(jobErr);
        const isMax = job.attempts + 1 >= job.max_attempts;

        await pool.query(
          "UPDATE processing_jobs SET status = ?, error_message = ? WHERE id = ?",
          [isMax ? "failed" : "queued", errMessage, job.id]
        );
      }
    }
  } catch (err) {
    console.error("Worker poll error:", err);
  } finally {
    isWorkerBusy = false;
  }

  return processedCount;
}

/**
 * Helper to enqueue a thumbnail job
 */
export async function enqueueThumbnailJob(mediaId: number): Promise<void> {
  await pool.query(
    "INSERT INTO processing_jobs (media_id, job_type, status) VALUES (?, 'thumbnail', 'queued')",
    [mediaId]
  );
  // Trigger processing asynchronously without waiting
  setImmediate(() => {
    runJobQueueWorker().catch(console.error);
  });
}

/**
 * Helper to enqueue a purge job for permanent deletion
 */
export async function enqueuePurgeJob(mediaId: number): Promise<void> {
  await pool.query("UPDATE media SET purge_requested_at = NOW() WHERE id = ?", [mediaId]);
  await pool.query(
    "INSERT INTO processing_jobs (media_id, job_type, status) VALUES (?, 'purge', 'queued')",
    [mediaId]
  );
  setImmediate(() => {
    runJobQueueWorker().catch(console.error);
  });
}
