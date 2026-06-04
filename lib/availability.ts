/**
 * Booking availability — single source of truth for "is this cabin free
 * during these dates?". Used by:
 *   • /api/checkout to reject double-bookings from the public website.
 *   • /api/admin/booking to reject double-bookings from manual entries.
 *   • /api/availability to expose blocked dates to the front-end calendar.
 *
 * Treats both `pending` and `paid` bookings as blocking — once a guest
 * is in checkout (pending), we hold the dates so a second guest can't
 * race them. Cancelled/failed bookings free up the dates again.
 */

import { listBookings, type BookingRecord } from './bookingStore';

const BLOCKING_STATUSES: ReadonlySet<BookingRecord['status']> = new Set([
  'pending',
  'paid',
]);

/** Two date ranges A=[a1,a2) and B=[b1,b2) overlap iff a1 < b2 && b1 < a2. */
function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function isBlocking(b: BookingRecord, cabanaSlug: string, excludeRef?: string): boolean {
  if (excludeRef && b.reference === excludeRef) return false;
  if (!BLOCKING_STATUSES.has(b.status)) return false;
  // We match against EITHER the cabanaSlug field OR the human cabana name,
  // since older bookings created before we added the slug field only have
  // the localized name. The webhook fallback uses a placeholder name, so
  // those won't block anything — which is the safe default.
  if (b.cabanaSlug && b.cabanaSlug === cabanaSlug) return true;
  return false;
}

export interface ConflictResult {
  conflicts: BookingRecord[];
  hasConflict: boolean;
}

/** Returns bookings (pending or paid) for the given cabin that overlap the
 *  requested check-in / check-out range. Same-day checkout-then-checkin is
 *  allowed (overlap uses strict less-than). */
export async function findConflicts(
  cabanaSlug: string,
  checkIn: string,
  checkOut: string,
  options: { excludeReference?: string } = {},
): Promise<ConflictResult> {
  const all = await listBookings();
  const conflicts = all.filter(
    (b) =>
      isBlocking(b, cabanaSlug, options.excludeReference) &&
      b.checkIn &&
      b.checkOut &&
      b.checkIn !== '—' &&
      b.checkOut !== '—' &&
      rangesOverlap(checkIn, checkOut, b.checkIn, b.checkOut),
  );
  return { conflicts, hasConflict: conflicts.length > 0 };
}

export interface BlockedRange {
  checkIn: string;
  checkOut: string;
  status: BookingRecord['status'];
}

/** Returns every blocking range for a cabin — used by /api/availability so
 *  the BookingWidget can grey out booked dates in the calendar. */
export async function getBlockedRanges(cabanaSlug: string): Promise<BlockedRange[]> {
  const all = await listBookings();
  return all
    .filter((b) => isBlocking(b, cabanaSlug))
    .filter(
      (b) =>
        b.checkIn && b.checkOut && b.checkIn !== '—' && b.checkOut !== '—',
    )
    .map((b) => ({
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.status,
    }));
}
