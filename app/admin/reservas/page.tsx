import { notFound } from 'next/navigation';
import { timingSafeEqual } from 'node:crypto';

import { BookingList } from '@/components/BookingList';
import { ManualBookingForm } from '@/components/ManualBookingForm';
import { cabanas } from '@/lib/cabanas';
import { listBookings, type BookingStatus } from '@/lib/bookingStore';
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

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AdminReservasPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !token || !safeEqual(token, expected)) {
    notFound();
  }

  const allBookings = await listBookings();

  // Counters across everything.
  const counts: Record<BookingStatus, number> = {
    pending: 0,
    paid: 0,
    cancelled: 0,
    failed: 0,
  };
  for (const b of allBookings) counts[b.status] = (counts[b.status] ?? 0) + 1;

  // Active = anything not cancelled or failed.
  const active = allBookings.filter(
    (b) => b.status !== 'cancelled' && b.status !== 'failed',
  );
  const cancelled = allBookings.filter(
    (b) => b.status === 'cancelled' || b.status === 'failed',
  );

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = active.filter((b) => b.checkIn >= today && b.checkIn !== '—');
  const past = active.filter((b) => b.checkIn < today && b.checkIn !== '—');
  const undated = active.filter((b) => b.checkIn === '—');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reservas Villa Sarita</h1>
        <p className={styles.subtitle}>
          {allBookings.length === 0
            ? 'Sin reservas todavía.'
            : `${counts.paid} pagadas · ${counts.pending} pendientes · ${counts.cancelled + counts.failed} canceladas/fallidas`}
        </p>
      </header>

      <ManualBookingForm
        token={token}
        cabanas={cabanas.map((c) => ({
          slug: c.slug,
          name: c.name,
          rate: c.nightlyRateCop,
          capacity: c.capacity,
        }))}
      />

      {upcoming.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>Próximas</h2>
          <BookingList bookings={upcoming} token={token} />
        </section>
      )}

      {undated.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>Sin fechas (revisar)</h2>
          <BookingList bookings={undated} token={token} />
        </section>
      )}

      {past.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>Pasadas</h2>
          <BookingList bookings={past} token={token} />
        </section>
      )}

      {cancelled.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>Canceladas</h2>
          <BookingList
            bookings={cancelled}
            token={token}
            collapsible
            defaultCollapsed
          />
        </section>
      )}

      {allBookings.length === 0 && (
        <p className={styles.empty}>
          Cuando llegue una reserva, aparecerá aquí automáticamente.
        </p>
      )}

      <footer className={styles.footer}>
        Actualizado: {new Date().toLocaleString('es-CO')}
        {' · '}
        <a
          href={`https://wa.me/${siteData.whatsappNumber.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      </footer>
    </div>
  );
}
