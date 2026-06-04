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

const log = (...args: unknown[]) => console.log('[wompi-webhook]', ...args);
const logErr = (...args: unknown[]) => console.error('[wompi-webhook]', ...args);

function isWellFormed(body: unknown): body is WompiEventBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (typeof b.event !== 'string') return false;
  if (typeof b.timestamp !== 'number') return false;
  if (!b.signature || typeof b.signature !== 'object') return false;
  const sig = b.signature as Record<string, unknown>;
  if (!Array.isArray(sig.properties)) return false;
  if (typeof sig.checksum !== 'string') return false;
  if (!b.data || typeof b.data !== 'object') return false;
  return true;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
    logErr('failed to parse body', err);
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!isWellFormed(body)) {
    logErr('body is not a well-formed Wompi event', {
      keys: body && typeof body === 'object' ? Object.keys(body as object) : null,
    });
    return NextResponse.json({ error: 'malformed_event' }, { status: 400 });
  }

  log('received event', {
    event: body.event,
    txStatus: body.data?.transaction?.status,
    txReference: body.data?.transaction?.reference,
    sigPropsCount: body.signature.properties.length,
  });

  let signatureValid = false;
  try {
    signatureValid = verifyWompiSignature(body);
  } catch (err) {
    logErr('signature verification threw', err);
    return NextResponse.json({ error: 'signature_check_failed' }, { status: 500 });
  }
  if (!signatureValid) {
    logErr('invalid signature — secret mismatch or tampered payload');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }
  log('signature OK');

  if (body.event !== 'transaction.updated') {
    log('event ignored (not transaction.updated):', body.event);
    return NextResponse.json({ ok: true, ignored: body.event });
  }

  const tx = body.data.transaction;
  if (tx.status !== 'APPROVED') {
    log('transaction not approved, skipping host notify:', tx.status);
    return NextResponse.json({ ok: true, status: tx.status });
  }

  // Idempotency: Wompi can fire the same webhook multiple times.
  if (hasProcessedTransaction(tx.id)) {
    log('duplicate webhook for tx', tx.id);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const booking = loadBooking(tx.reference);
  log('booking lookup', {
    reference: tx.reference,
    found: !!booking,
  });
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

  // Notify on every channel — failures on one don't block the others.
  const results = await Promise.allSettled([
    sendHostNotification(notifyPayload),
    sendHostWhatsApp(notifyPayload),
  ]);
  const channels = ['email', 'whatsapp'] as const;
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      logErr(`${channels[i]} notify FAILED:`, r.reason instanceof Error ? r.reason.message : r.reason);
    } else {
      log(`${channels[i]} notify ok`);
    }
  });

  markTransactionProcessed(tx.id);
  if (booking) deleteBooking(tx.reference);

  return NextResponse.json({
    ok: true,
    notified: Object.fromEntries(results.map((r, i) => [channels[i], r.status])),
    note: booking ? undefined : 'booking_not_found',
  });
}
