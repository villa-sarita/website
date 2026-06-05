import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { logAdminAction } from '@/lib/auditLog';
import { cancelBooking, loadBooking } from '@/lib/bookingStore';
import { SESSION_COOKIE, verifyPassword, verifySessionToken } from '@/lib/session';

export const runtime = 'nodejs';

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

interface CancelPayload {
  reference: string;
  reason: string;
}

export async function POST(request: Request) {
  if (!(await authOk(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let p: CancelPayload;
  try {
    p = (await request.json()) as CancelPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!p.reference || typeof p.reference !== 'string') {
    return NextResponse.json({ error: 'missing_reference' }, { status: 400 });
  }
  if (!p.reason || typeof p.reason !== 'string' || !p.reason.trim()) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  const existing = await loadBooking(p.reference);
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (existing.status === 'cancelled') {
    return NextResponse.json({ error: 'already_cancelled' }, { status: 409 });
  }

  const updated = await cancelBooking(p.reference, p.reason.trim(), 'admin');

  await logAdminAction({
    actor: 'admin',
    action: 'booking_cancelled',
    bookingId: p.reference,
    reason: p.reason.trim(),
    metadata: {
      previousStatus: existing.status,
      source: existing.source ?? 'online',
      paymentMethod: existing.paymentMethod,
      cabanaSlug: existing.cabanaSlug,
      checkIn: existing.checkIn,
      checkOut: existing.checkOut,
    },
  });

  return NextResponse.json({ ok: true, booking: updated });
}
