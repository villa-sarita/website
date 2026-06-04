import { notFound } from 'next/navigation';
import { timingSafeEqual } from 'node:crypto';

import { listBookings, type BookingRecord, type BookingStatus } from '@/lib/bookingStore';
import siteData from '@/content/site.json';

import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  if (!iso || iso === '—') return iso;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function buildWhatsAppLink(phone: string | undefined, _message?: string): string | null {
  if (!phone) return null;
  const normalised = phone.replace(/[^0-9]/g, '');
  if (!normalised) return null;
  // Always open a blank conversation — pre-filled messages felt templated/spammy.
  return `https://wa.me/${normalised}`;
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  cancelled: 'Cancelada',
  failed: 'Fallida',
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AdminReservasPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !token || !safeEqual(token, expected)) {
    notFound();
  }

  const bookings = await listBookings();

  // Split into upcoming / past based on check-in date.
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.checkIn >= today && b.checkIn !== '—');
  const past = bookings.filter((b) => b.checkIn < today && b.checkIn !== '—');
  const undated = bookings.filter((b) => b.checkIn === '—');

  // Counts by status (across all bookings).
  const counts: Record<BookingStatus, number> = {
    pending: 0,
    paid: 0,
    cancelled: 0,
    failed: 0,
  };
  for (const b of bookings) counts[b.status] = (counts[b.status] ?? 0) + 1;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reservas Villa Sarita</h1>
        <p className={styles.subtitle}>
          {bookings.length === 0
            ? 'Sin reservas todavía.'
            : `${counts.paid} pagadas · ${counts.pending} pendientes · ${counts.cancelled + counts.failed} canceladas/fallidas`}
        </p>
      </header>

      {upcoming.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>Próximas</h2>
          <ul className={styles.list}>
            {upcoming.map((b) => (
              <BookingRow key={b.reference} booking={b} />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>Pasadas</h2>
          <ul className={styles.list}>
            {past.map((b) => (
              <BookingRow key={b.reference} booking={b} muted />
            ))}
          </ul>
        </section>
      )}

      {undated.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>Sin fechas (revisar)</h2>
          <ul className={styles.list}>
            {undated.map((b) => (
              <BookingRow key={b.reference} booking={b} />
            ))}
          </ul>
        </section>
      )}

      {bookings.length === 0 && (
        <p className={styles.empty}>
          Cuando llegue una reserva, aparecerá aquí automáticamente.
        </p>
      )}

      <footer className={styles.footer}>
        Actualizado: {new Date().toLocaleString('es-CO')}
        {' · '}
        <a
          href={buildWhatsAppLink(
            siteData.whatsappNumber,
            '¿Cómo va Villa Sarita hoy?',
          ) ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      </footer>
    </div>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status-${status}`]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function BookingRow({ booking, muted }: { booking: BookingRecord; muted?: boolean }) {
  const balance = booking.totalCop - booking.depositCop;
  const waLink = buildWhatsAppLink(
    booking.guestPhone,
    `Hola ${booking.guestName.split(' ')[0]}, te escribo de Villa Sarita por tu reserva (${booking.reference}).`,
  );

  return (
    <li className={`${styles.row} ${muted ? styles.rowMuted : ''}`}>
      <div className={styles.rowHead}>
        <div>
          <span className={styles.cabin}>{booking.cabana}</span>
          <span className={styles.dates}>
            {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
          </span>
        </div>
        <div className={styles.guests}>
          <StatusBadge status={booking.status} />
          {booking.guests > 0 && (
            <span style={{ marginLeft: 8 }}>
              {booking.guests} {booking.guests === 1 ? 'huésped' : 'huéspedes'}
            </span>
          )}
          {booking.hasEvent && <span className={styles.eventBadge}>Evento</span>}
        </div>
      </div>

      <div className={styles.guestBlock}>
        <strong className={styles.guestName}>{booking.guestName}</strong>
        {booking.guestPhone && <span className={styles.guestPhone}>{booking.guestPhone}</span>}
        {booking.guestEmail && <span className={styles.guestEmail}>{booking.guestEmail}</span>}
      </div>

      <div className={styles.priceBlock}>
        <div className={styles.priceLine}>
          <span>Total estadía</span>
          <strong>{formatCurrency(booking.totalCop)}</strong>
        </div>
        <div className={`${styles.priceLine} ${styles.deposit}`}>
          <span>Anticipo {booking.status === 'paid' ? 'pagado' : 'pendiente'}</span>
          <strong>{formatCurrency(booking.depositCop)}</strong>
        </div>
        <div className={`${styles.priceLine} ${styles.balance}`}>
          <span>Saldo al llegar</span>
          <strong>{formatCurrency(balance)}</strong>
        </div>
      </div>

      {booking.eventDescription && (
        <div className={styles.eventBlock}>
          <span className={styles.eventLabel}>Evento solicitado:</span>
          <p>{booking.eventDescription}</p>
        </div>
      )}

      <div className={styles.actions}>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.actionWa}
          >
            WhatsApp al huésped
          </a>
        )}
        {booking.guestPhone && (
          <a href={`tel:${booking.guestPhone}`} className={styles.actionCall}>
            Llamar
          </a>
        )}
      </div>

      <div className={styles.ref}>
        {booking.reference}
        {booking.transactionId && (
          <> · Wompi <code>{booking.transactionId}</code></>
        )}
      </div>
    </li>
  );
}
