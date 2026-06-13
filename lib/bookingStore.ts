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
/**
 * Where the booking originated.
 *   online         — guest paid through the public site via Wompi
 *   manual         — host recorded a phone/in-person booking from the admin form
 *   event_inquiry  — guest filled the standalone event form (no Wompi charge;
 *                    the host quotes per-event over WhatsApp)
 */
export type BookingSource = 'online' | 'manual' | 'event_inquiry';
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
  /** Cancellation metadata — populated by cancelBooking(). */
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  /** The booking's status immediately before cancelBooking() — used by
   *  restoreBooking() to put the booking back in the right bucket. */
  previousStatus?: BookingStatus;
  /** Event-inquiry fields — set when source === 'event_inquiry'. */
  eventType?: string; // slug from content/experiencias.json or 'otro'
  eventTime?: string; // free-form, e.g. "tarde", "18:00"
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

/**
 * Mark a booking as cancelled. Records who did it, when, and why. Once
 * status='cancelled' the BLOCKING_STATUSES filter in availability.ts no
 * longer treats it as taking up the cabin, so the freed dates become
 * bookable again on both the public site and the manual-booking form.
 */
export async function cancelBooking(
  reference: string,
  reason: string,
  actor: string,
): Promise<BookingRecord | null> {
  const existing = await loadBooking(reference);
  if (!existing) return null;
  const now = new Date().toISOString();
  const updated: BookingRecord = {
    ...existing,
    status: 'cancelled',
    updatedAt: now,
    cancelledAt: now,
    cancelledBy: actor,
    cancellationReason: reason,
    previousStatus: existing.status,
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

/**
 * Undo a cancellation — flip status back to whatever it was before
 * cancelBooking() flipped it (paid, pending, etc.), clear the cancellation
 * metadata. Returns null if the booking isn't currently cancelled, so the
 * caller can return a clean 400.
 */
export async function restoreBooking(
  reference: string,
): Promise<BookingRecord | null> {
  const existing = await loadBooking(reference);
  if (!existing) return null;
  if (existing.status !== 'cancelled') return null;
  const now = new Date().toISOString();
  const restoreTo: BookingStatus = existing.previousStatus ?? 'paid';
  const updated: BookingRecord = {
    ...existing,
    status: restoreTo,
    updatedAt: now,
  };
  // Wipe cancellation metadata so the row goes back to looking active.
  delete updated.cancelledAt;
  delete updated.cancelledBy;
  delete updated.cancellationReason;
  delete updated.previousStatus;
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

/**
 * Hard-delete a booking — removes both the booking record AND its entry in
 * the bookings:index sorted set so it stops showing up in listBookings().
 * Irreversible. Only used by the admin Eliminar action on cancelled/failed
 * bookings to keep the list tidy.
 */
export async function deleteBooking(reference: string): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const [del] = await Promise.all([
      redis.del(KEY_BOOKING(reference)),
      redis.zrem(KEY_REF_INDEX, reference),
    ]);
    return del > 0;
  }
  const state = readFs();
  if (!(reference in state.bookings)) return false;
  delete state.bookings[reference];
  writeFs(state);
  return true;
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
