import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AdminLogoutButton } from '@/components/AdminLogoutButton';
import { BookingList, type CabinMetaForEdit } from '@/components/BookingList';
import { ChangePasswordButton } from '@/components/ChangePasswordButton';
import { ManualBookingForm } from '@/components/ManualBookingForm';
import { allowsExtraGuests, cabanas } from '@/lib/cabanas';
import { listBookings, type BookingStatus } from '@/lib/bookingStore';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';
import siteData from '@/content/site.json';

import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AdminReservasPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) {
    redirect('/admin/login?next=/admin/reservas');
  }

  const allBookings = await listBookings();

  const counts: Record<BookingStatus, number> = {
    pending: 0,
    paid: 0,
    cancelled: 0,
    failed: 0,
  };
  for (const b of allBookings) counts[b.status] = (counts[b.status] ?? 0) + 1;

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

  const cabinMeta: Record<string, CabinMetaForEdit> = Object.fromEntries(
    cabanas.map((c) => [
      c.slug,
      {
        slug: c.slug,
        rate: c.nightlyRateCop,
        capacity: c.capacity,
        allowsExtras: allowsExtraGuests(c),
      },
    ]),
  );

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
        cabanas={cabanas.map((c) => ({
          slug: c.slug,
          name: c.name,
          rate: c.nightlyRateCop,
          capacity: c.capacity,
          allowsExtras: allowsExtraGuests(c),
        }))}
      />

      {upcoming.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>Próximas</h2>
          <BookingList bookings={upcoming} cabins={cabinMeta} />
        </section>
      )}

      {undated.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>Sin fechas (revisar)</h2>
          <BookingList bookings={undated} cabins={cabinMeta} />
        </section>
      )}

      {past.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>Pasadas</h2>
          <BookingList bookings={past} cabins={cabinMeta} />
        </section>
      )}

      {cancelled.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>Canceladas</h2>
          <BookingList bookings={cancelled} collapsible defaultCollapsed />
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
        {' · '}
        <ChangePasswordButton />
        {' · '}
        <AdminLogoutButton />
      </footer>
    </div>
  );
}
