import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { logAdminAction } from '@/lib/auditLog';
import { findConflicts } from '@/lib/availability';
import { loadBooking, saveBooking, type PaymentMethod } from '@/lib/bookingStore';
import { allowsExtraGuests, getCabana } from '@/lib/cabanas';
import { SESSION_COOKIE, verifyPassword, verifySessionToken } from '@/lib/session';

export const runtime = 'nodejs';

async function authOk(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (session) return true;
  const header = request.headers.get('authorization') ?? '';
  if (header.startsWith('Bearer ')) {
    return await verifyPassword(header.slice(7));
  }
  return false;
}

interface EditBookingPayload {
  reference: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  extras?: number;
  animals?: number;
  guestName: string;
  guestPhone?: string;
  paymentMethod?: PaymentMethod;
  totalCop: number;
  depositCop: number;
  notes?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  if (!(await authOk(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let p: EditBookingPayload;
  try {
    p = (await request.json()) as EditBookingPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (
    !p.reference ||
    !p.checkIn ||
    !p.checkOut ||
    !ISO_DATE.test(p.checkIn) ||
    !ISO_DATE.test(p.checkOut) ||
    typeof p.guests !== 'number' ||
    typeof p.totalCop !== 'number' ||
    typeof p.depositCop !== 'number' ||
    !p.guestName
  ) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  if (p.checkOut <= p.checkIn) {
    return NextResponse.json({ error: 'invalid_dates' }, { status: 400 });
  }

  const existing = await loadBooking(p.reference);
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (existing.status === 'cancelled' || existing.status === 'failed') {
    return NextResponse.json({ error: 'booking_inactive' }, { status: 400 });
  }

  // Cabin can't be re-assigned mid-flight — keeps photos/links sane.
  const cabana = existing.cabanaSlug ? getCabana(existing.cabanaSlug) : undefined;
  if (!cabana) {
    return NextResponse.json({ error: 'cabin_unknown' }, { status: 400 });
  }
  if (p.guests < 1 || p.guests > cabana.capacity) {
    return NextResponse.json({ error: 'invalid_guests' }, { status: 400 });
  }
  const extras = Math.max(0, Math.floor(p.extras ?? 0));
  const animals = Math.max(0, Math.floor(p.animals ?? 0));
  if (extras > 0 && !allowsExtraGuests(cabana)) {
    return NextResponse.json({ error: 'extras_not_allowed' }, { status: 400 });
  }

  // Conflict check — exclude this booking from the search so an unchanged
  // date range doesn't "conflict with itself".
  const { hasConflict, conflicts } = await findConflicts(
    cabana.slug,
    p.checkIn,
    p.checkOut,
    { excludeReference: p.reference },
  );
  if (hasConflict) {
    return NextResponse.json(
      {
        error: 'dates_unavailable',
        conflicts: conflicts.map((c) => ({
          reference: c.reference,
          checkIn: c.checkIn,
          checkOut: c.checkOut,
          guestName: c.guestName,
          status: c.status,
        })),
      },
      { status: 409 },
    );
  }

  const before = {
    checkIn: existing.checkIn,
    checkOut: existing.checkOut,
    guests: existing.guests,
    extras: existing.extras ?? 0,
    animals: existing.animals ?? 0,
    totalCop: existing.totalCop,
    depositCop: existing.depositCop,
  };

  await saveBooking(p.reference, {
    ...existing,
    checkIn: p.checkIn,
    checkOut: p.checkOut,
    guests: p.guests,
    extras,
    animals,
    guestName: p.guestName,
    guestPhone: p.guestPhone ?? existing.guestPhone,
    paymentMethod: p.paymentMethod ?? existing.paymentMethod,
    totalCop: p.totalCop,
    depositCop: p.depositCop,
    notes: p.notes ?? existing.notes,
    createdAt: existing.createdAt,
  });

  await logAdminAction({
    actor: 'admin',
    action: 'booking_edited',
    bookingId: p.reference,
    metadata: {
      before,
      after: {
        checkIn: p.checkIn,
        checkOut: p.checkOut,
        guests: p.guests,
        extras,
        animals,
        totalCop: p.totalCop,
        depositCop: p.depositCop,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
