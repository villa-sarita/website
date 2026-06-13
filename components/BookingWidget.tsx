'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { DateRange, Matcher } from 'react-day-picker';

import type { Dictionary, Locale } from '@/i18n/dictionaries';
import type { Cabana } from '@/lib/cabanas';
import { allowsExtraGuests } from '@/lib/cabanas';
import { diffInNights, toISODate } from '@/lib/format';
import {
  ANIMAL_NIGHTLY_COP,
  EXTRA_PERSON_NIGHTLY_COP,
  calculateBreakdown,
  formatCurrency,
} from '@/lib/price';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import siteData from '@/content/site.json';

import { DateRangePicker } from './DateRangePicker';
import { GuestCounter } from './GuestCounter';
import styles from './BookingWidget.module.css';

interface BookingWidgetProps {
  cabana: Cabana;
  locale: Locale;
  dict: Dictionary;
}

interface BlockedRange {
  checkIn: string;
  checkOut: string;
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
}

/** Convert a YYYY-MM-DD ISO string to a local Date at noon (DST-safe). */
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function BookingWidget({ cabana, locale, dict }: BookingWidgetProps) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(Math.min(2, cabana.capacity));
  const [extras, setExtras] = useState(0);
  const [animals, setAnimals] = useState(0);
  const [blocked, setBlocked] = useState<BlockedRange[]>([]);

  const canHaveExtras = allowsExtraGuests(cabana);

  // Fetch already-booked ranges for this cabin so we can grey them out
  // in the calendar. Don't block render on this — picker still works
  // without the data, the server will still reject conflicts at submit.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/availability?cabana=${encodeURIComponent(cabana.slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.ranges) setBlocked(data.ranges as BlockedRange[]);
      })
      .catch(() => {
        /* non-fatal — submit-time check still catches it */
      });
    return () => {
      cancelled = true;
    };
  }, [cabana.slug]);

  // Block the full check-in → check-out span (both ends inclusive). The
  // auntie's mental model is "those dates are taken"; she doesn't run
  // same-day turnover.
  const disabledMatchers = useMemo<Matcher[]>(
    () =>
      blocked.map((b) => ({ from: parseDate(b.checkIn), to: parseDate(b.checkOut) })),
    [blocked],
  );

  const nights = useMemo(
    () => (range?.from && range?.to ? diffInNights(range.from, range.to) : 0),
    [range],
  );

  const breakdown = useMemo(
    () =>
      calculateBreakdown(cabana.nightlyRateCop, nights, {
        extras: canHaveExtras ? extras : 0,
        animals,
      }),
    [cabana.nightlyRateCop, nights, canHaveExtras, extras, animals],
  );

  const canBook = nights > 0;

  const onReserve = () => {
    if (!canBook || !range?.from || !range?.to) return;
    const params = new URLSearchParams({
      from: toISODate(range.from),
      to: toISODate(range.to),
      guests: String(guests),
    });
    if (canHaveExtras && extras > 0) params.set('extras', String(extras));
    if (animals > 0) params.set('animals', String(animals));
    router.push(`/${locale}/reservar/${cabana.slug}?${params.toString()}`);
  };

  const whatsappMsg =
    locale === 'en'
      ? `Hi, I'd like to ask about ${cabana.nameEn} — availability and details.`
      : `Hola, quisiera consultar por la ${cabana.name} — disponibilidad y detalles.`;
  const whatsappHref = buildWhatsAppLink(siteData.whatsappNumber, whatsappMsg);

  return (
    <aside className={styles.widget}>
      <div className={styles.priceHead}>
        <div>
          <span className={styles.from}>{dict.cabanas.fromPerNight}</span>
          <strong className={styles.rate}>{formatCurrency(cabana.nightlyRateCop, locale)}</strong>
          <span className={styles.per}> / {dict.cabanas.perNight}</span>
        </div>
      </div>

      <DateRangePicker
        locale={locale}
        value={range}
        onChange={setRange}
        labels={{ checkIn: dict.booking.checkIn, checkOut: dict.booking.checkOut }}
        disabledMatchers={disabledMatchers}
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

      {canHaveExtras && (
        <GuestCounter
          value={extras}
          onChange={setExtras}
          min={0}
          max={99}
          label={`${dict.booking.extras} (+${formatCurrency(EXTRA_PERSON_NIGHTLY_COP, locale)} / ${dict.cabanas.perNight})`}
          addLabel={dict.booking.addExtra}
          removeLabel={dict.booking.removeExtra}
          maxLabel=""
        />
      )}

      <GuestCounter
        value={animals}
        onChange={setAnimals}
        min={0}
        max={99}
        label={`${dict.booking.animals} (+${formatCurrency(ANIMAL_NIGHTLY_COP, locale)} / ${dict.cabanas.perNight})`}
        addLabel={dict.booking.addAnimal}
        removeLabel={dict.booking.removeAnimal}
        maxLabel=""
      />

      {nights > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>
              {formatCurrency(cabana.nightlyRateCop, locale)} × {nights} {dict.booking.nights}
            </span>
            <span>{formatCurrency(breakdown.base, locale)}</span>
          </div>
          {breakdown.extras > 0 && (
            <div className={styles.summaryRow}>
              <span>
                {breakdown.extras} × {dict.booking.extraLine}
              </span>
              <span>{formatCurrency(breakdown.extrasCost, locale)}</span>
            </div>
          )}
          {breakdown.animals > 0 && (
            <div className={styles.summaryRow}>
              <span>
                {breakdown.animals} × {dict.booking.animalLine}
              </span>
              <span>{formatCurrency(breakdown.animalsCost, locale)}</span>
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
        </div>
      )}

      <button
        type="button"
        onClick={onReserve}
        disabled={!canBook}
        className={`btn btn-primary ${styles.cta}`}
      >
        {dict.cabanas.bookButton}
      </button>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.hostLink}
      >
        {dict.cabanas.messageHost} →
      </a>
    </aside>
  );
}
