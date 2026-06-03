'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import type { Dictionary, Locale } from '@/i18n/dictionaries';
import type { Cabana } from '@/lib/cabanas';
import { diffInNights, toISODate } from '@/lib/format';
import { calculateBreakdown, formatCurrency } from '@/lib/price';
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

export function BookingWidget({ cabana, locale, dict }: BookingWidgetProps) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(Math.min(2, cabana.capacity));

  const nights = useMemo(
    () => (range?.from && range?.to ? diffInNights(range.from, range.to) : 0),
    [range],
  );

  const breakdown = useMemo(
    () => calculateBreakdown(cabana.nightlyRateCop, nights),
    [cabana.nightlyRateCop, nights],
  );

  const canBook = nights > 0;

  const onReserve = () => {
    if (!canBook || !range?.from || !range?.to) return;
    const params = new URLSearchParams({
      from: toISODate(range.from),
      to: toISODate(range.to),
      guests: String(guests),
    });
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

      {nights > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>
              {formatCurrency(cabana.nightlyRateCop, locale)} × {nights} {dict.booking.nights}
            </span>
            <span>{formatCurrency(breakdown.subtotal, locale)}</span>
          </div>
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
