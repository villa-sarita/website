/**
 * File-backed booking store, keyed by Wompi reference.
 *
 * Saved bookings persist to disk so they survive process restarts on a
 * traditional server (VPS, Railway, Fly.io, etc.).
 *
 * Serverless caveat: Vercel / Netlify Lambdas have an ephemeral filesystem.
 * Before deploying there, swap the persistence layer for Vercel KV / Upstash
 * Redis / Vercel Postgres. The exported function names below can stay the
 * same so the swap is a one-file change.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { HostNotificationParams } from './email';

export type BookingRecord = Omit<HostNotificationParams, 'transactionId'> & {
  /** ISO timestamp the booking was created. Used for housekeeping. */
  createdAt?: string;
};

const STORE_PATH =
  process.env.BOOKING_STORE_PATH ?? join(process.cwd(), 'data', 'bookings.json');

const globalForStore = globalThis as unknown as {
  __villaSaritaBookings?: Map<string, BookingRecord>;
  __villaSaritaProcessedTxns?: Set<string>;
};

function readFromDisk(): Map<string, BookingRecord> {
  try {
    if (!existsSync(STORE_PATH)) return new Map();
    const raw = readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, BookingRecord>;
    return new Map(Object.entries(parsed));
  } catch (err) {
    console.error('bookingStore: failed to read', err);
    return new Map();
  }
}

function writeToDisk(map: Map<string, BookingRecord>) {
  try {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    const obj = Object.fromEntries(map.entries());
    writeFileSync(STORE_PATH, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('bookingStore: failed to write', err);
  }
}

function getStore(): Map<string, BookingRecord> {
  if (!globalForStore.__villaSaritaBookings) {
    globalForStore.__villaSaritaBookings = readFromDisk();
  }
  return globalForStore.__villaSaritaBookings;
}

function getProcessed(): Set<string> {
  if (!globalForStore.__villaSaritaProcessedTxns) {
    globalForStore.__villaSaritaProcessedTxns = new Set();
  }
  return globalForStore.__villaSaritaProcessedTxns;
}

export function saveBooking(reference: string, record: BookingRecord) {
  const store = getStore();
  const withMeta: BookingRecord = {
    ...record,
    createdAt: record.createdAt ?? new Date().toISOString(),
  };
  store.set(reference, withMeta);
  writeToDisk(store);
}

export function loadBooking(reference: string): BookingRecord | undefined {
  return getStore().get(reference);
}

export function deleteBooking(reference: string) {
  const store = getStore();
  if (store.delete(reference)) {
    writeToDisk(store);
  }
}

/** Idempotency: returns true if this transaction id was already handled. */
export function hasProcessedTransaction(transactionId: string): boolean {
  return getProcessed().has(transactionId);
}

export function markTransactionProcessed(transactionId: string) {
  getProcessed().add(transactionId);
}
