import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import crypto from "crypto";

const BASE_STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), "storage");

export const STORAGE_PATHS = {
  originals: path.join(BASE_STORAGE_DIR, "originals"),
  variants: path.join(BASE_STORAGE_DIR, "variants"),
  temp: path.join(BASE_STORAGE_DIR, "temp"),
};

// Ensure directories exist
export async function ensureStorageDirectories(): Promise<void> {
  await fsPromises.mkdir(STORAGE_PATHS.originals, { recursive: true });
  await fsPromises.mkdir(STORAGE_PATHS.variants, { recursive: true });
  await fsPromises.mkdir(STORAGE_PATHS.temp, { recursive: true });
}

/**
 * Generate an opaque random storage key preserving safe extension
 */
export function generateStorageKey(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const uuid = crypto.randomUUID();
  return `${uuid}${ext}`;
}

/**
 * Get absolute path for an original file
 */
export function getOriginalPath(storageKey: string): string {
  return path.join(STORAGE_PATHS.originals, path.basename(storageKey));
}

/**
 * Get absolute path for a variant file (thumbnail, preview, poster)
 */
export function getVariantPath(storageKey: string): string {
  return path.join(STORAGE_PATHS.variants, path.basename(storageKey));
}

/**
 * Get absolute path for a temp file during upload
 */
export function getTempPath(uploadSessionId: string): string {
  return path.join(STORAGE_PATHS.temp, `${uploadSessionId}.tmp`);
}

/**
 * Append or write a chunk to a temp file
 */
export async function appendChunkToTemp(
  uploadSessionId: string,
  chunkBuffer: Buffer,
  offset: number
): Promise<number> {
  await ensureStorageDirectories();
  const tempPath = getTempPath(uploadSessionId);

  const handle = await fsPromises.open(
    tempPath,
    fs.constants.O_CREAT | fs.constants.O_RDWR
  );
  try {
    await handle.write(chunkBuffer, 0, chunkBuffer.length, offset);
    const stat = await handle.stat();
    return stat.size;
  } finally {
    await handle.close();
  }
}

/**
 * Move a temp file to originals folder
 */
export async function finalizeTempFile(
  uploadSessionId: string,
  storageKey: string
): Promise<{ size: number; path: string }> {
  await ensureStorageDirectories();
  const tempPath = getTempPath(uploadSessionId);
  const targetPath = getOriginalPath(storageKey);

  await fsPromises.rename(tempPath, targetPath);
  const stat = await fsPromises.stat(targetPath);
  return { size: stat.size, path: targetPath };
}

/**
 * Delete a file safely without throwing if file doesn't exist
 */
export async function safeDeleteFile(filePath: string): Promise<boolean> {
  try {
    await fsPromises.unlink(filePath);
    return true;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`Failed to delete file at ${filePath}:`, err);
    }
    return false;
  }
}

/**
 * Stream a file with optional range support for HTTP 206 Partial Content
 */
export function getFileStream(
  filePath: string,
  start?: number,
  end?: number
): fs.ReadStream {
  const options: { start?: number; end?: number } = {};
  if (typeof start === "number") options.start = start;
  if (typeof end === "number") options.end = end;
  return fs.createReadStream(filePath, options);
}
