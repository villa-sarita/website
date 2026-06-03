import { NextResponse } from 'next/server';

import {
  deleteBooking,
  hasProcessedTransaction,
  loadBooking,
  markTransactionProcessed,
} from '@/lib/bookingStore';
import { sendHostNotification } from '@/lib/email';
import { sendHostWhatsApp } from '@/lib/whatsapp-cloud';
import { verifyWompiSignature, type WompiEventBody } from '@/lib/wompi';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: WompiEventBody;
  try {
    body = (await request.json()) as WompiEventBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!verifyWompiSignature(body)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  if (body.event !== 'transaction.updated') {
    return NextResponse.json({ ok: true, ignored: body.event });
  }

  const tx = body.data.transaction;
  if (tx.status !== 'APPROVED') {
    return NextResponse.json({ ok: true, status: tx.status });
  }

  // Idempotency: Wompi can fire the same webhook multiple times. Don't email
  // the host twice for the same transaction.
  if (hasProcessedTransaction(tx.id)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const booking = loadBooking(tx.reference);
  const notifyPayload = booking
    ? { ...booking, transactionId: tx.id }
    : {
        reference: tx.reference,
        cabana: '(no encontrada — ver localStorage del huésped)',
        checkIn: '—',
        checkOut: '—',
        guests: 0,
        totalCop: tx.amount_in_cents / 100,
        depositCop: tx.amount_in_cents / 100,
        guestName: tx.customer_data?.full_name ?? 'Desconocido',
        guestEmail: tx.customer_email ?? '',
        guestPhone: tx.customer_data?.phone_number,
        hasEvent: false,
        transactionId: tx.id,
      };

  // Notify the host on every channel we have configured. Failures on one
  // channel must not block the others — auntie should still hear about the
  // booking even if e.g. WhatsApp Cloud isn't set up yet.
  const results = await Promise.allSettled([
    sendHostNotification(notifyPayload),
    sendHostWhatsApp(notifyPayload),
  ]);
  for (const r of results) {
    if (r.status === 'rejected') console.error('host notify channel failed', r.reason);
  }

  markTransactionProcessed(tx.id);
  if (booking) deleteBooking(tx.reference);

  return NextResponse.json({
    ok: true,
    notified: results.map((r) => r.status),
    note: booking ? undefined : 'booking_not_found',
  });
}
