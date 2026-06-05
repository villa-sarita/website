/**
 * Admin auth — stateless HMAC-signed session cookies.
 *
 * Pattern:
 *   • Password to log in = `ADMIN_TOKEN` env var (same value that used to
 *     live in the URL).
 *   • On successful login the server generates a 32-byte random session
 *     ID + an expiry timestamp, signs them with HMAC-SHA256 using
 *     ADMIN_TOKEN as the key, and stores `<id>.<expires>.<hmac>` in an
 *     HttpOnly + Secure + SameSite=Strict cookie. No server-side
 *     storage — verification is just an HMAC check.
 *   • Rotating ADMIN_TOKEN invalidates every previously-issued session
 *     in one move (since the HMAC key changes).
 *
 * The cookie is the only thing that grants admin access after login.
 * Leaking the cookie does NOT leak the password.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'vs_admin_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const s = process.env.ADMIN_TOKEN;
  if (!s) throw new Error('ADMIN_TOKEN is not set');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export interface Session {
  id: string;
  expiresAt: number;
}

export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

/** Issue a fresh signed session token. */
export function createSessionToken(): IssuedSession {
  const id = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${id}.${expiresAt}`;
  const sig = sign(payload);
  return {
    token: `${payload}.${sig}`,
    expiresAt: new Date(expiresAt),
  };
}

/**
 * Verify and parse a session token. Returns null if missing, malformed,
 * expired, signed with a different ADMIN_TOKEN, or any other failure.
 * Uses constant-time HMAC comparison to avoid timing attacks.
 */
export function verifySessionToken(token: string | undefined): Session | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [id, expiresStr, sig] = parts;
  if (!id || !expiresStr || !sig) return null;

  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt)) return null;
  if (Date.now() > expiresAt) return null;

  // Constant-time HMAC compare.
  const expected = sign(`${id}.${expiresStr}`);
  let sigBuf: Buffer;
  let expectedBuf: Buffer;
  try {
    sigBuf = Buffer.from(sig, 'hex');
    expectedBuf = Buffer.from(expected, 'hex');
  } catch {
    return null;
  }
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  return { id, expiresAt };
}

/** Constant-time equality check of a typed password against ADMIN_TOKEN. */
export function verifyPassword(input: string): boolean {
  if (!input) return false;
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
