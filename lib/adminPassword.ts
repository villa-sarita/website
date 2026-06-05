/**
 * Admin password storage + verification.
 *
 * Priority order on verify:
 *   1. Hashed password stored in Upstash under `admin:password_hash`.
 *      This is the *real* current password — set via /api/admin/change-password.
 *   2. Fall back to the `ADMIN_TOKEN` env var (plaintext compare).
 *      This is the initial-setup / recovery value. To "reset" the password
 *      back to the env var, delete the `admin:password_hash` key in
 *      Upstash and the next login will accept ADMIN_TOKEN again.
 *
 * Storage format for the hash:
 *   `scrypt:<saltHex>:<hashHex>` — scrypt is in node:crypto, no external
 *   dep, and it's appropriately slow against brute force.
 */

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { Redis } from '@upstash/redis';

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options?: { N?: number; r?: number; p?: number; maxmem?: number },
) => Promise<Buffer>;

const KEY_HASH = 'admin:password_hash';
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const HASH_LEN = 64;
const SALT_LEN = 16;

let _redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    _redis = null;
    return null;
  }
  _redis = new Redis({ url, token });
  return _redis;
}

/** Compute a scrypt hash string for the given plaintext. */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const hash = await scryptAsync(plaintext, salt, HASH_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

/** Constant-time verify a plaintext against a stored "scrypt:salt:hash" string. */
async function verifyStoredHash(plaintext: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[1], 'hex');
    expected = Buffer.from(parts[2], 'hex');
  } catch {
    return false;
  }
  if (expected.length !== HASH_LEN) return false;
  let actual: Buffer;
  try {
    actual = await scryptAsync(plaintext, salt, HASH_LEN, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: 64 * 1024 * 1024,
    });
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** Plaintext compare against the env var (initial-setup / reset path). */
function verifyEnvFallback(plaintext: string): boolean {
  const expected = (process.env.ADMIN_TOKEN ?? '').trim();
  if (!expected) return false;
  const a = Buffer.from(plaintext);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Verify a typed password. Trims whitespace defensively. */
export async function verifyPassword(input: string | undefined): Promise<boolean> {
  const typed = (input ?? '').trim();
  if (!typed) return false;

  const redis = getRedis();
  if (redis) {
    const stored = await redis.get<string>(KEY_HASH);
    if (stored && typeof stored === 'string') {
      // Stored hash exists — that's the source of truth.
      return verifyStoredHash(typed, stored);
    }
  }

  // No stored hash → fall back to the env var.
  return verifyEnvFallback(typed);
}

/** Store a new hashed password. Persists in Upstash; requires Redis to be configured. */
export async function setStoredPassword(newPlaintext: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error('Upstash Redis is not configured — cannot persist password.');
  }
  const hashStr = await hashPassword(newPlaintext);
  await redis.set(KEY_HASH, hashStr);
}

/** True if a hashed password has been set in Upstash (i.e. the env-var
 *  fallback is no longer in use). Useful for telling the UI whether the
 *  admin is on initial-setup mode. */
export async function hasStoredPassword(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const stored = await redis.get<string>(KEY_HASH);
  return typeof stored === 'string' && stored.length > 0;
}
