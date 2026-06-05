import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { findConflicts } from '@/lib/availability';
import { saveBooking, type PaymentMethod } from '@/lib/bookingStore';
import { getCabana, getCabanaName } from '@/lib/cabanas';
import { SESSION_COOKIE, verifyPassword, verifySessionToken } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * Admin auth — prefer the cookie session (set by /api/admin/login). Fall
 * back to `Authorization: Bearer <ADMIN_TOKEN>` so scripts and curl tests
 * keep working.
 */
async function authOk(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (session) return true;
  const header = request.headers.get('authorization') ?? '';
  if (header.startsWith('Bearer ')) {
    return verifyPassword(header.slice(7));
  }
  return false;
}

interface ManualBookingPayload {
  cabanaSlug: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guests: number;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  totalCop: number;
  depositCop: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  if (!(await authOk(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let p: ManualBookingPayload;
  try {
    p = (await request.json()) as ManualBookingPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Validation
  if (
    !p.cabanaSlug ||
    !p.guestName ||
    !p.checkIn ||
    !p.checkOut ||
    !ISO_DATE.test(p.checkIn) ||
    !ISO_DATE.test(p.checkOut) ||
    typeof p.guests !== 'number' ||
    typeof p.totalCop !== 'number' ||
    typeof p.depositCop !== 'number' ||
    !p.paymentMethod
  ) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  if (p.checkOut <= p.checkIn) {
    return NextResponse.json({ error: 'invalid_dates' }, { status: 400 });
  }

  const cabana = getCabana(p.cabanaSlug);
  if (!cabana) {
    return NextResponse.json({ error: 'unknown_cabana' }, { status: 400 });
  }
  if (p.guests < 1 || p.guests > cabana.capacity) {
    return NextResponse.json({ error: 'invalid_guests' }, { status: 400 });
  }
  if (!['wompi', 'cash', 'transfer', 'other'].includes(p.paymentMethod)) {
    return NextResponse.json({ error: 'invalid_payment_method' }, { status: 400 });
  }

  // Conflict check — same rule the public checkout uses.
  const { hasConflict, conflicts } = await findConflicts(
    p.cabanaSlug,
    p.checkIn,
    p.checkOut,
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

  // Build a reference for the manual booking. Distinct prefix so it's
  // visually obvious in the admin list that these came from your aunt's
  // phone bookings, not from the public site.
  const reference = `vs-manual-${p.cabanaSlug}-${Date.now().toString(36)}`;

  await saveBooking(reference, {
    reference,
    cabana: getCabanaName(cabana, 'es'),
    cabanaSlug: p.cabanaSlug,
    source: 'manual',
    status: 'paid', // manual bookings are recorded post-fact, already paid (or fully agreed)
    paymentMethod: p.paymentMethod,
    checkIn: p.checkIn,
    checkOut: p.checkOut,
    guests: p.guests,
    totalCop: p.totalCop,
    depositCop: p.depositCop,
    guestName: p.guestName,
    guestEmail: p.guestEmail ?? '',
    guestPhone: p.guestPhone,
    hasEvent: false,
    notes: p.notes,
  });

  return NextResponse.json({ ok: true, reference });
}
