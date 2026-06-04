import { NextResponse } from 'next/server';

import { findConflicts } from '@/lib/availability';
import { saveBooking } from '@/lib/bookingStore';
import { getCabana, getCabanaName } from '@/lib/cabanas';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { calculateBreakdown } from '@/lib/price';
import { buildCheckoutUrl, buildReference } from '@/lib/wompi';

export const runtime = 'nodejs';

interface CheckoutPayload {
  cabanaSlug: string;
  cabanaName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  totalCop: number;
  depositCop: number;
  hasEvent: boolean;
  eventDescription: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestCountry?: string;
  locale: 'es' | 'en';
  /** Honeypot — must be empty for the request to be accepted. */
  website?: string;
}

/** Cents tolerance when re-validating client-sent prices against server math. */
const PRICE_TOLERANCE = 100; // 100 COP (1 peso)

export async function POST(request: Request) {
  // 1. Rate limit by IP — 10 requests/minute
  const ip = getClientIp(request);
  const rate = checkRateLimit(`checkout:${ip}`, 10, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'retry-after': String(rate.retryAfter) } },
    );
  }

  // 2. Parse body
  let payload: CheckoutPayload;
  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // 3. Honeypot — bots fill the hidden 'website' field; humans don't.
  // Pretend success so the bot doesn't retry.
  if (payload.website && payload.website.trim()) {
    return NextResponse.json({
      checkoutUrl: '/',
      reference: 'noop',
    });
  }

  // 4. Required-field validation
  if (
    !payload.cabanaSlug ||
    !payload.guestEmail ||
    !payload.guestName ||
    !payload.guestPhone ||
    !payload.checkIn ||
    !payload.checkOut ||
    typeof payload.guests !== 'number'
  ) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  // 5. Cabin must exist
  const cabana = getCabana(payload.cabanaSlug);
  if (!cabana) {
    return NextResponse.json({ error: 'unknown_cabana' }, { status: 400 });
  }

  // 6. Capacity check
  if (payload.guests < 1 || payload.guests > cabana.capacity) {
    return NextResponse.json({ error: 'invalid_guests' }, { status: 400 });
  }

  // 7. Date sanity + server-side nights calculation
  const checkInDate = new Date(`${payload.checkIn}T12:00:00`);
  const checkOutDate = new Date(`${payload.checkOut}T12:00:00`);
  if (
    Number.isNaN(checkInDate.getTime()) ||
    Number.isNaN(checkOutDate.getTime())
  ) {
    return NextResponse.json({ error: 'invalid_dates' }, { status: 400 });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (checkInDate < today) {
    return NextResponse.json({ error: 'check_in_past' }, { status: 400 });
  }

  const ms = checkOutDate.getTime() - checkInDate.getTime();
  const serverNights = Math.round(ms / (1000 * 60 * 60 * 24));
  if (serverNights <= 0) {
    return NextResponse.json({ error: 'no_nights' }, { status: 400 });
  }

  // 8. Re-compute prices server-side, reject if client lied
  const serverBreakdown = calculateBreakdown(cabana.nightlyRateCop, serverNights);
  const totalDiff = Math.abs(serverBreakdown.subtotal - payload.totalCop);
  const depositDiff = Math.abs(serverBreakdown.deposit - payload.depositCop);
  if (totalDiff > PRICE_TOLERANCE || depositDiff > PRICE_TOLERANCE) {
    return NextResponse.json(
      {
        error: 'price_mismatch',
        expected: serverBreakdown,
      },
      { status: 400 },
    );
  }

  // 8b. Availability check — reject if any pending/paid booking for this
  //     cabin overlaps the requested dates. Covers BOTH another guest
  //     who's already in checkout AND a manual reservation the host
  //     entered after a phone call.
  const { hasConflict } = await findConflicts(
    payload.cabanaSlug,
    payload.checkIn,
    payload.checkOut,
  );
  if (hasConflict) {
    return NextResponse.json({ error: 'dates_unavailable' }, { status: 409 });
  }

  // 9. Build Wompi checkout
  const reference = buildReference(payload.cabanaSlug);
  const amountInCents = Math.round(serverBreakdown.deposit * 100);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.headers.get('origin') ??
    'http://localhost:3000';
  const redirectUrl = `${siteUrl}/${payload.locale}/reservar/confirmacion?reference=${encodeURIComponent(reference)}`;

  let checkoutUrl: string;
  try {
    checkoutUrl = buildCheckoutUrl({
      reference,
      amountInCents,
      email: payload.guestEmail,
      fullName: payload.guestName,
      phone: payload.guestPhone,
      redirectUrl,
    });
  } catch (err) {
    console.error('checkout build failed', err);
    return NextResponse.json({ error: 'config_error' }, { status: 500 });
  }

  // 10. Persist booking (Upstash Redis in prod, filesystem fallback in dev).
  //     Status starts as "pending"; the Wompi webhook flips it to "paid".
  try {
    await saveBooking(reference, {
      reference,
      cabana: getCabanaName(cabana, payload.locale),
      cabanaSlug: payload.cabanaSlug,
      source: 'online',
      paymentMethod: 'wompi',
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      guests: payload.guests,
      totalCop: serverBreakdown.subtotal,
      depositCop: serverBreakdown.deposit,
      guestName: payload.guestName,
      guestEmail: payload.guestEmail,
      guestPhone: payload.guestPhone,
      hasEvent: !!payload.hasEvent,
      eventDescription: payload.eventDescription ?? '',
    });
  } catch (err) {
    console.error('[checkout] saveBooking failed', err);
    // Don't block the checkout if the store write fails — the webhook
    // will recreate the booking record from Wompi's payload as a fallback.
  }

  return NextResponse.json({ checkoutUrl, reference });
}
