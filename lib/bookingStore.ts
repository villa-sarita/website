/**
 * Booking store — persistent, async, status-tracked.
 *
 * Production: Upstash Redis (auto-injected via the Vercel Marketplace
 * integration; env vars UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 * Local dev: falls back to a JSON file on disk if the Upstash env vars are
 * missing, so `npm run dev` works without a Redis connection.
 *
 * Bookings are NEVER deleted after payment — instead their status field
 * flips from "pending" → "paid" so the admin page shows the complete
 * history.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Redis } from '@upstash/redis';

import type { HostNotificationParams } from './email';

export type BookingStatus = 'pending' | 'paid' | 'cancelled' | 'failed';
export type BookingSource = 'online' | 'manual';
export type PaymentMethod = 'wompi' | 'cash' | 'transfer' | 'other';

export type BookingRecord = Omit<HostNotificationParams, 'transactionId'> & {
  /** The cabin slug — needed to filter availability per-cabin. */
  cabanaSlug?: string;
  status: BookingStatus;
  source?: BookingSource;
  paymentMethod?: PaymentMethod;
  /** Free-form notes the host can attach to a manual booking. */
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  transactionId?: string;
};

// ---------------------------------------------------------------------------
// Redis-backed implementation (production)
// ---------------------------------------------------------------------------

const KEY_BOOKING = (reference: string) => `booking:${reference}`;
const KEY_REF_INDEX = 'bookings:index'; // sorted set of references (score = ms timestamp)
const KEY_PROCESSED = 'tx:processed';

let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.warn(
      'bookingStore: Upstash Redis env vars not set — falling back to local file store',
    );
    _redis = null;
    return null;
  }
  _redis = new Redis({ url, token });
  return _redis;
}

// ---------------------------------------------------------------------------
// Filesystem fallback (local dev only)
// ---------------------------------------------------------------------------

const FS_STORE_PATH =
  process.env.BOOKING_STORE_PATH ?? join(process.cwd(), 'data', 'bookings.json');

interface FsState {
  bookings: Record<string, BookingRecord>;
  processedTx: string[];
}

function readFs(): FsState {
  try {
    if (!existsSync(FS_STORE_PATH)) return { bookings: {}, processedTx: [] };
    const raw = readFileSync(FS_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'bookings' in parsed) {
      return parsed as FsState;
    }
    // Legacy format: a flat record of bookings without the processedTx list.
    return { bookings: parsed as Record<string, BookingRecord>, processedTx: [] };
  } catch (err) {
    console.error('bookingStore (fs): read failed', err);
    return { bookings: {}, processedTx: [] };
  }
}

function writeFs(state: FsState) {
  try {
    mkdirSync(dirname(FS_STORE_PATH), { recursive: true });
    writeFileSync(FS_STORE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('bookingStore (fs): write failed', err);
  }
}

// ---------------------------------------------------------------------------
// Public API — all functions are async
// ---------------------------------------------------------------------------

export async function saveBooking(
  reference: string,
  record: Omit<BookingRecord, 'status' | 'createdAt'> & {
    status?: BookingStatus;
    createdAt?: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const full: BookingRecord = {
    ...record,
    status: record.status ?? 'pending',
    createdAt: record.createdAt ?? now,
    updatedAt: now,
  };

  const redis = getRedis();
  if (redis) {
    await Promise.all([
      redis.set(KEY_BOOKING(reference), JSON.stringify(full)),
      redis.zadd(KEY_REF_INDEX, { score: Date.parse(full.createdAt), member: reference }),
    ]);
    return;
  }

  const state = readFs();
  state.bookings[reference] = full;
  writeFs(state);
}

export async function loadBooking(
  reference: string,
): Promise<BookingRecord | null> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<string | BookingRecord>(KEY_BOOKING(reference));
    if (!raw) return null;
    // Upstash auto-deserialises JSON sometimes; handle both shapes.
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as BookingRecord;
      } catch {
        return null;
      }
    }
    return raw;
  }
  const state = readFs();
  return state.bookings[reference] ?? null;
}

export async function listBookings(): Promise<BookingRecord[]> {
  const redis = getRedis();
  if (redis) {
    // Most recent first.
    const refs = await redis.zrange<string[]>(KEY_REF_INDEX, 0, -1, { rev: true });
    if (!refs || refs.length === 0) return [];
    const raws = await Promise.all(
      refs.map((ref) => redis.get<string | BookingRecord>(KEY_BOOKING(ref))),
    );
    const out: BookingRecord[] = [];
    for (const raw of raws) {
      if (!raw) continue;
      if (typeof raw === 'string') {
        try {
          out.push(JSON.parse(raw) as BookingRecord);
        } catch {
          /* skip corrupted */
        }
      } else {
        out.push(raw);
      }
    }
    return out;
  }
  const state = readFs();
  return Object.values(state.bookings).sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  );
}

export async function updateBookingStatus(
  reference: string,
  status: BookingStatus,
  transactionId?: string,
): Promise<BookingRecord | null> {
  const existing = await loadBooking(reference);
  const now = new Date().toISOString();
  if (existing) {
    const updated: BookingRecord = {
      ...existing,
      status,
      transactionId: transactionId ?? existing.transactionId,
      updatedAt: now,
    };
    const redis = getRedis();
    if (redis) {
      await redis.set(KEY_BOOKING(reference), JSON.stringify(updated));
    } else {
      const state = readFs();
      state.bookings[reference] = updated;
      writeFs(state);
    }
    return updated;
  }
  return null;
}

export async function hasProcessedTransaction(
  transactionId: string,
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const member = await redis.sismember(KEY_PROCESSED, transactionId);
    return member === 1;
  }
  const state = readFs();
  return state.processedTx.includes(transactionId);
}

export async function markTransactionProcessed(
  transactionId: string,
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.sadd(KEY_PROCESSED, transactionId);
    return;
  }
  const state = readFs();
  if (!state.processedTx.includes(transactionId)) {
    state.processedTx.push(transactionId);
    writeFs(state);
  }
}
