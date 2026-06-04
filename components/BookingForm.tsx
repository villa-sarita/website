'use client';

import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';
import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import type { Dictionary, Locale } from '@/i18n/dictionaries';
import type { Cabana } from '@/lib/cabanas';
import { getCabanaName } from '@/lib/cabanas';
import { diffInNights, formatDate, toISODate } from '@/lib/format';
import { calculateBreakdown, formatCurrency } from '@/lib/price';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import siteData from '@/content/site.json';

import { DateRangePicker } from './DateRangePicker';
import { EventToggle } from './EventToggle';
import { GuestCounter } from './GuestCounter';
import styles from './BookingForm.module.css';

interface BookingFormProps {
  cabana: Cabana;
  locale: Locale;
  dict: Dictionary;
  initialFrom?: Date;
  initialTo?: Date;
  initialGuests?: number;
}

export function BookingForm({
  cabana,
  locale,
  dict,
  initialFrom,
  initialTo,
  initialGuests,
}: BookingFormProps) {
  const [range, setRange] = useState<DateRange | undefined>(
    initialFrom && initialTo ? { from: initialFrom, to: initialTo } : undefined,
  );
  const [guests, setGuests] = useState(
    Math.min(initialGuests ?? 2, cabana.capacity),
  );
  const [eventOn, setEventOn] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState<string | undefined>('+57');
  const [country, setCountry] = useState('Colombia');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Honeypot: bots will fill this hidden field, humans won't.
  const [website, setWebsite] = useState('');

  const nights = useMemo(
    () => (range?.from && range?.to ? diffInNights(range.from, range.to) : 0),
    [range],
  );
  const breakdown = useMemo(
    () => calculateBreakdown(cabana.nightlyRateCop, nights),
    [cabana.nightlyRateCop, nights],
  );

  const hasBasics = nights > 0 && name.trim() && phone && !submitting;
  // Wompi checkout requires an email — the WhatsApp path doesn't.
  const canPayOnline = hasBasics && email.trim();
  const canBookByWhatsapp = hasBasics;

  let whatsappBookingHref = '';
  if (range?.from && range?.to) {
    const ci = toISODate(range.from);
    const co = toISODate(range.to);
    const msg =
      locale === 'en'
        ? `Hi! I'd like to book ${getCabanaName(cabana, locale)}.\n\n*Check-in:* ${ci}\n*Check-out:* ${co}\n*Guests:* ${guests}\n*Name:* ${name.trim() || '(pending)'}${phone ? `\n*Phone:* ${phone}` : ''}${eventOn ? `\n*Event:* yes` : ''}`
        : `¡Hola! Quiero reservar la ${getCabanaName(cabana, locale)}.\n\n*Llegada:* ${ci}\n*Salida:* ${co}\n*Huéspedes:* ${guests}\n*Nombre:* ${name.trim() || '(por confirmar)'}${phone ? `\n*Teléfono:* ${phone}` : ''}${eventOn ? `\n*Evento:* sí` : ''}`;
    whatsappBookingHref = buildWhatsAppLink(siteData.whatsappNumber, msg);
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPayOnline || !range?.from || !range?.to) return;
    if (website) return; // honeypot triggered — silently drop
    setError(null);
    setSubmitting(true);

    const payload = {
      cabanaSlug: cabana.slug,
      cabanaName: getCabanaName(cabana, locale),
      checkIn: toISODate(range.from),
      checkOut: toISODate(range.to),
      guests,
      nights,
      totalCop: breakdown.subtotal,
      depositCop: breakdown.deposit,
      hasEvent: eventOn,
      eventDescription: '',
      guestName: name.trim(),
      guestEmail: email.trim(),
      guestPhone: phone,
      guestCountry: country.trim(),
      locale,
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 && data.error === 'dates_unavailable') {
          setError(
            locale === 'en'
              ? 'Those dates were just taken. Please pick different dates — the calendar will refresh on reload.'
              : 'Esas fechas acaban de ser reservadas. Por favor elige otras fechas — el calendario se actualiza al recargar.',
          );
          setSubmitting(false);
          return;
        }
        throw new Error(data.error || 'Checkout failed');
      }
      const { checkoutUrl, reference } = await res.json();
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          `vs-booking-${reference}`,
          JSON.stringify(payload),
        );
      }
      window.location.assign(checkoutUrl);
    } catch (err) {
      console.error(err);
      setError(dict.booking.errorGeneric);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <div className={styles.col}>
        {/* Step 1 */}
        <section className={styles.section}>
          <h3 className={styles.stepHead}>
            <span className={styles.stepNum}>01</span>
            {dict.booking.stepDates}
          </h3>
          <DateRangePicker
            locale={locale}
            value={range}
            onChange={setRange}
            labels={{ checkIn: dict.booking.checkIn, checkOut: dict.booking.checkOut }}
          />
          <GuestCounter
            value={guests}
            onChange={setGuests}
            max={cabana.capacity}
            label={dict.booking.guests}
            addLabel={dict.booking.addGuest}
            removeLabel={dict.booking.removeGuest}
            maxLabel={dict.booking.maxGuestsReached}
          />
        </section>

        {/* Step 2 — event */}
        <section className={styles.section}>
          <h3 className={styles.stepHead}>
            <span className={styles.stepNum}>02</span>
            {dict.booking.stepEvent}
          </h3>
          <p className={styles.stepHelp}>{dict.booking.eventToggleHelp}</p>
          <EventToggle
            enabled={eventOn}
            onToggle={setEventOn}
            dict={dict}
          />
        </section>

        {/* Step 3 — guest details */}
        <section className={styles.section}>
          <h3 className={styles.stepHead}>
            <span className={styles.stepNum}>03</span>
            {dict.booking.stepGuest}
          </h3>
          <div className={styles.fields}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{dict.booking.fullName}</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                autoComplete="name"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {dict.booking.email}{' '}
                <span className={styles.optional}>({dict.booking.optional})</span>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                autoComplete="email"
                placeholder={dict.booking.emailHelp}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{dict.booking.phone}</span>
              <PhoneInput
                defaultCountry="CO"
                international
                value={phone}
                onChange={setPhone}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{dict.booking.country}</span>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={styles.input}
                autoComplete="country-name"
              />
            </label>
          </div>
          {/* Honeypot — invisible to humans, bots love to fill it */}
          <label className={styles.honeypot} aria-hidden="true">
            Website
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
        </section>
      </div>

      {/* Sidebar summary */}
      <aside className={styles.sidebar}>
        <div className={styles.sticky}>
          <h3 className={styles.summaryTitle}>{dict.booking.stepSummary}</h3>
          <div className={styles.summaryRow}>
            <span>{getCabanaName(cabana, locale)}</span>
            <span>{guests} {dict.cabanas.capacityNoun}</span>
          </div>
          {range?.from && range?.to && (
            <div className={styles.summaryRow}>
              <span>{formatDate(range.from, locale)}</span>
              <span>→ {formatDate(range.to, locale)}</span>
            </div>
          )}
          <div className={styles.summaryDivider} />
          <div className={styles.summaryRow}>
            <span>
              {formatCurrency(cabana.nightlyRateCop, locale)} × {nights} {dict.booking.nights}
            </span>
            <span>{formatCurrency(breakdown.subtotal, locale)}</span>
          </div>
          {eventOn && (
            <div className={`${styles.summaryRow} ${styles.summaryMuted}`}>
              <span>{dict.booking.eventExtra}</span>
              <em>{dict.booking.eventQuoted}</em>
            </div>
          )}
          <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
            <span>{dict.booking.total}</span>
            <strong>{formatCurrency(breakdown.subtotal, locale)}</strong>
          </div>
          <div className={`${styles.summaryRow} ${styles.summaryDeposit}`}>
            <span>{dict.booking.deposit}</span>
            <strong>{formatCurrency(breakdown.deposit, locale)}</strong>
          </div>
          <div className={`${styles.summaryRow} ${styles.summaryBalance}`}>
            <span>{dict.booking.balance}</span>
            <strong>{formatCurrency(breakdown.balance, locale)}</strong>
          </div>
          <p className={styles.balanceHelp}>{dict.booking.balanceHelp}</p>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={`btn btn-primary ${styles.cta}`}
            disabled={!canPayOnline}
          >
            {submitting ? dict.booking.processing : dict.booking.payDeposit}
          </button>

          <div className={styles.orRow} aria-hidden="true">
            <span className={styles.orLine} />
            <span className={styles.orText}>{dict.booking.or}</span>
            <span className={styles.orLine} />
          </div>

          <a
            href={canBookByWhatsapp ? whatsappBookingHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.whatsappCta} ${!canBookByWhatsapp ? styles.whatsappCtaDisabled : ''}`}
            aria-disabled={!canBookByWhatsapp}
            onClick={(e) => {
              if (!canBookByWhatsapp) e.preventDefault();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.92 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.69 14.07c-.24.68-1.42 1.31-1.95 1.39-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.6-2.91-1.26-4.81-4.19-4.96-4.38-.14-.2-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1.01-2.41.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.14.07.14.12.31.02.5-.1.2-.15.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.29-.13.57.17.29.74 1.22 1.59 1.97 1.09.97 2 1.27 2.29 1.42.29.14.46.12.62-.07.17-.2.71-.83.9-1.11.19-.29.39-.24.65-.14.27.1 1.69.8 1.98.94.29.14.48.21.55.33.07.12.07.71-.17 1.39z"/>
            </svg>
            {dict.booking.bookByWhatsapp}
          </a>
          <p className={styles.whatsappHint}>{dict.booking.whatsappHint}</p>

          {!canPayOnline && !submitting && (
            <p className={styles.ctaHint}>{dict.booking.ctaHint}</p>
          )}
        </div>
      </aside>
    </form>
  );
}
