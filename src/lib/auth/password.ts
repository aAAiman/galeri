import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  algorithm: 2, // Argon2id
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return await hash(plainPassword, ARGON2_OPTIONS);
}

/**
 * Verify a plain password against an Argon2id hash
 */
export async function verifyPassword(
  hashStr: string,
  plainPassword: string
): Promise<boolean> {
  try {
    return await verify(hashStr, plainPassword);
  } catch (error) {
    console.error("Argon2 verification failed:", error);
    return false;
  }
}
