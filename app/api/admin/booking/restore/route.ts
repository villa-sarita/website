import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { logAdminAction } from '@/lib/auditLog';
import { findConflicts } from '@/lib/availability';
import { loadBooking, restoreBooking } from '@/lib/bookingStore';
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

export async function POST(request: Request) {
  if (!(await authOk(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { reference?: string };
  try {
    body = (await request.json()) as { reference?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!body.reference) {
    return NextResponse.json({ error: 'missing_reference' }, { status: 400 });
  }

  const existing = await loadBooking(body.reference);
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (existing.status !== 'cancelled') {
    return NextResponse.json({ error: 'not_cancelled' }, { status: 400 });
  }

  // Someone might have re-booked those dates after this booking was
  // cancelled — re-check the window before flipping the status back.
  if (
    existing.cabanaSlug &&
    existing.checkIn &&
    existing.checkOut &&
    existing.checkIn !== '—' &&
    existing.checkOut !== '—'
  ) {
    const { hasConflict, conflicts } = await findConflicts(
      existing.cabanaSlug,
      existing.checkIn,
      existing.checkOut,
      { excludeReference: existing.reference },
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
  }

  const restored = await restoreBooking(body.reference);
  if (!restored) {
    return NextResponse.json({ error: 'restore_failed' }, { status: 500 });
  }

  await logAdminAction({
    actor: 'admin',
    action: 'booking_restored',
    bookingId: body.reference,
    metadata: { restoredTo: restored.status },
  });

  return NextResponse.json({ ok: true, status: restored.status });
}
