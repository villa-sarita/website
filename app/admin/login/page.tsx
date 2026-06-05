import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AdminLoginForm } from '@/components/AdminLoginForm';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Acceso · Villa Sarita',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;

  // Already logged in → straight to bookings (or the page they came from).
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (session) {
    redirect(next && next.startsWith('/admin/') ? next : '/admin/reservas');
  }

  // Only honour `next` if it's a same-app admin path — never trust a full URL.
  const safeNext =
    next && next.startsWith('/admin/') ? next : '/admin/reservas';

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Villa Sarita</h1>
        <p className={styles.subtitle}>Acceso de administración</p>
        <AdminLoginForm next={safeNext} />
        <p className={styles.hint}>
          Sólo Claudia conoce esta contraseña. Después de iniciar sesión, tu
          dispositivo recordará el acceso por 30 días.
        </p>
      </div>
    </div>
  );
}
