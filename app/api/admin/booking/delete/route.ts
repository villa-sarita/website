import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { logAdminAction } from '@/lib/auditLog';
import { deleteBooking, loadBooking } from '@/lib/bookingStore';
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
  // Only allow purging entries that are already cancelled or failed —
  // never the active bookings, even by mistake.
  if (existing.status !== 'cancelled' && existing.status !== 'failed') {
    return NextResponse.json({ error: 'booking_active' }, { status: 400 });
  }

  const ok = await deleteBooking(body.reference);
  if (!ok) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  await logAdminAction({
    actor: 'admin',
    action: 'booking_deleted',
    bookingId: body.reference,
    metadata: {
      cabanaSlug: existing.cabanaSlug,
      cabana: existing.cabana,
      checkIn: existing.checkIn,
      checkOut: existing.checkOut,
      guestName: existing.guestName,
      priorStatus: existing.status,
    },
  });

  return NextResponse.json({ ok: true });
}
