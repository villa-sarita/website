import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { logAdminAction } from '@/lib/auditLog';
import { cancelBooking, loadBooking } from '@/lib/bookingStore';

export const runtime = 'nodejs';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function authOk(request: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return false;
  return safeEqual(token, expected);
}

interface CancelPayload {
  reference: string;
  reason: string;
}

export async function POST(request: Request) {
  if (!authOk(request)) {
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
