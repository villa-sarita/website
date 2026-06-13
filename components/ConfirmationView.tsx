'use client';

import { useEffect, useState } from 'react';

import type { Dictionary, Locale } from '@/i18n/dictionaries';
import { formatDate, formatTime12h } from '@/lib/format';
import { formatCurrency } from '@/lib/price';
import { buildBookingMessage, buildWhatsAppLink } from '@/lib/whatsapp';
import siteData from '@/content/site.json';

import styles from './ConfirmationView.module.css';

interface StoredBooking {
  cabanaName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalCop: number;
  depositCop: number;
  guestName: string;
  guestEmail: string;
  hasEvent: boolean;
  eventDescription?: string;
}

interface ConfirmationViewProps {
  locale: Locale;
  dict: Dictionary;
  reference: string;
}

export function ConfirmationView({ locale, dict, reference }: ConfirmationViewProps) {
  const [booking, setBooking] = useState<StoredBooking | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(`vs-booking-${reference}`);
    if (!raw) return;
    try {
      // Reading from localStorage is genuinely external state, the effect is correct here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBooking(JSON.parse(raw) as StoredBooking);
    } catch {
      /* ignore */
    }
  }, [reference]);

  const balance = booking ? booking.totalCop - booking.depositCop : 0;

  const whatsappHref = booking
    ? buildWhatsAppLink(
        siteData.whatsappNumber,
        buildBookingMessage({
          cabana: booking.cabanaName,
          checkIn: formatDate(booking.checkIn, locale),
          checkOut: formatDate(booking.checkOut, locale),
          guests: booking.guests,
          total: formatCurrency(booking.totalCop, locale),
          deposit: formatCurrency(booking.depositCop, locale),
          hasEvent: booking.hasEvent,
          eventDescription: booking.eventDescription,
          guestName: booking.guestName,
          locale,
        }),
      )
    : '#';

  return (
    <div className={styles.card}>
      <span className={styles.checkmark} aria-hidden="true">
        <svg viewBox="0 0 60 60" width="60" height="60">
          <circle cx="30" cy="30" r="28" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M18 31 l9 9 l16 -18"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={styles.kicker}>{dict.confirmation.label}</span>
      <h1 className={styles.title}>{dict.confirmation.title}</h1>
      <p className={styles.subtitle}>{dict.confirmation.subtitle}</p>

      {booking && (
        <div className={styles.summary}>
          <h3 className={styles.summaryHead}>{dict.confirmation.summaryLabel}</h3>
          <div className={styles.row}>
            <span>{booking.cabanaName}</span>
            <span>
              {booking.guests} {dict.cabanas.capacityNoun}
            </span>
          </div>
          <div className={styles.row}>
            <span>{formatDate(booking.checkIn, locale)}</span>
            <span>→ {formatDate(booking.checkOut, locale)}</span>
          </div>
          <div className={`${styles.row} ${styles.times}`}>
            <span>
              {dict.booking.checkInFrom} {formatTime12h(siteData.checkIn, locale)}
            </span>
            <span>
              {dict.booking.checkOutBy} {formatTime12h(siteData.checkOut, locale)}
            </span>
          </div>
          <div className={styles.divider} />
          <div className={styles.row}>
            <span>{dict.booking.total}</span>
            <strong>{formatCurrency(booking.totalCop, locale)}</strong>
          </div>
          <div className={`${styles.row} ${styles.deposit}`}>
            <span>✓ {dict.booking.deposit}</span>
            <strong>{formatCurrency(booking.depositCop, locale)}</strong>
          </div>
          <div className={styles.balanceBlock}>
            <span className={styles.balanceLabel}>{dict.confirmation.balanceLabel}</span>
            <strong className={styles.balanceAmount}>
              {formatCurrency(balance, locale)}
            </strong>
            <p className={styles.balanceHelp}>{dict.confirmation.balanceHelp}</p>
          </div>
        </div>
      )}

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn btn-jungle ${styles.whatsappCta}`}
      >
        {dict.confirmation.whatsappCta}
      </a>

      <p className={styles.reference}>
        ref: <code>{reference}</code>
      </p>
    </div>
  );
}
