import { NextResponse } from 'next/server';

import { saveBooking } from '@/lib/bookingStore';
import { sendEventInquiry } from '@/lib/email';
import { experiencias, getExperiencia, getExperienciaName } from '@/lib/experiencias';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

interface EventInquiryPayload {
  /** Slug from content/experiencias.json, or 'otro' for free text. */
  eventType: string;
  /** Free-text fallback when eventType === 'otro'. */
  eventTypeOther?: string;
  eventDate: string; // YYYY-MM-DD
  eventTime?: string;
  guests: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  message?: string;
  locale?: 'es' | 'en';
  /** Honeypot for bots; must be empty. */
  website?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TYPES: ReadonlySet<string> = new Set([
  ...experiencias.map((e) => e.slug),
  'otro',
]);

export async function POST(request: Request) {
  // Rate limit (same pattern as cabin checkout).
  const ip = getClientIp(request);
  const rate = checkRateLimit(`event-inquiry:${ip}`, 10, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'retry-after': String(rate.retryAfter) } },
    );
  }

  let p: EventInquiryPayload;
  try {
    p = (await request.json()) as EventInquiryPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Honeypot — silently succeed so bots don't retry.
  if (p.website && p.website.trim()) {
    return NextResponse.json({ ok: true, reference: 'noop' });
  }

  // Required-field validation.
  if (
    !p.eventType ||
    !p.eventDate ||
    !ISO_DATE.test(p.eventDate) ||
    !p.guestName ||
    !p.guestPhone ||
    typeof p.guests !== 'number'
  ) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  if (!VALID_TYPES.has(p.eventType)) {
    return NextResponse.json({ error: 'invalid_event_type' }, { status: 400 });
  }
  if (p.eventType === 'otro' && !(p.eventTypeOther && p.eventTypeOther.trim())) {
    return NextResponse.json({ error: 'event_type_other_required' }, { status: 400 });
  }
  if (p.guests < 1 || p.guests > 500) {
    return NextResponse.json({ error: 'invalid_guests' }, { status: 400 });
  }

  // Date can't be in the past.
  const today = new Date().toISOString().slice(0, 10);
  if (p.eventDate < today) {
    return NextResponse.json({ error: 'event_date_past' }, { status: 400 });
  }

  // Build a human label for the event type.
  let label: string;
  if (p.eventType === 'otro') {
    label = p.eventTypeOther!.trim();
  } else {
    const exp = getExperiencia(p.eventType);
    label = exp ? getExperienciaName(exp, p.locale ?? 'es') : p.eventType;
  }

  const reference = `vs-evento-${p.eventType}-${Date.now().toString(36)}`;

  try {
    await saveBooking(reference, {
      reference,
      source: 'event_inquiry',
      status: 'pending',
      cabana: `Evento: ${label}`,
      // No cabin → no availability conflict.
      cabanaSlug: undefined,
      eventType: p.eventType,
      eventTime: p.eventTime?.trim() || undefined,
      checkIn: p.eventDate,
      checkOut: p.eventDate, // single-day events; same date both sides
      guests: p.guests,
      totalCop: 0, // custom-quoted by the host
      depositCop: 0,
      guestName: p.guestName.trim(),
      guestEmail: p.guestEmail?.trim() ?? '',
      guestPhone: p.guestPhone.trim(),
      hasEvent: true,
      eventDescription: p.message?.trim() || undefined,
    });
  } catch (err) {
    console.error('[event-inquiry] saveBooking failed', err);
    // Don't fail the request — the email is the safety net.
  }

  // Notify the host. Failure here SHOULD surface to the user so they
  // know to retry (otherwise the inquiry vanishes silently).
  try {
    await sendEventInquiry({
      reference,
      eventType: label,
      eventDate: p.eventDate,
      eventTime: p.eventTime?.trim() || undefined,
      guests: p.guests,
      guestName: p.guestName.trim(),
      guestPhone: p.guestPhone.trim(),
      guestEmail: p.guestEmail?.trim(),
      message: p.message?.trim(),
    });
  } catch (err) {
    console.error('[event-inquiry] sendEventInquiry failed', err);
    return NextResponse.json(
      { error: 'notify_failed', reference },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, reference });
}
